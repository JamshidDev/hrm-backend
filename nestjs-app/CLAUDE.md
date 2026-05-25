# HRM NestJS — CLAUDE.md

## Loyiha haqida

HRM (Human Resources Management) backend NestJS portasi. Laravel'dan (`hrm-backend/laravel-app`, port `8002`) NestJS'ga **endpoint-by-endpoint parity migration**. Hozir ikkala app parallel ishlaydi — frontend faqat `baseUrl`'ni almashtirsa NestJS'ga o'tadi.

| App | Port | Status |
|-----|------|--------|
| Laravel | `8002` | Reference (parity uchun manba) |
| NestJS  | `8001` | Migration target |

**Asosiy maqsad:** har bir endpoint Laravel bilan bayt-bayt mos response qaytarishi (body shape, totals, key tartibi).

## Tech Stack

- NestJS 11 + TypeScript
- Drizzle ORM 1.0 beta (PostgreSQL)
- `nestjs-cls` (per-request context, CLS-cached scope IDs)
- `nestjs-i18n` (3 til: `uz` default, `ru`, `en`)
- MinIO (S3-compatible storage)
- Bcrypt + Sanctum-style tokens (`{userId}|{plaintext}`)
- Swagger (`/docs`)

## Ishga tushirish

```bash
NODE_OPTIONS='--max-old-space-size=8192' npm run start:dev   # watch mode :8001
npm run lint
npm run build
```

`NODE_OPTIONS='--max-old-space-size=8192'` — ba'zi export endpointlar 50K+ rows yuklab JS heap'ni to'ldiradi.

---

## ROL VA YONDASHUV

Sen — **Senior Backend Developer**. Laravel parity migration ustida ishlaysan:

1. **Laravel side oldin o'qib chiq** — `hrm-backend/laravel-app/Modules/<Module>/app/Http/Controllers/*.php` + `Services/*.php` + `Models/*.php` (`scopeFilter`, `scopeSearch` muhim)
2. **Parity birinchi o'rinda** — body shape va totals Laravel bilan aynan mos bo'lishi shart
3. **Clean code** — SRP, DRY, KISS; aniq nomlar
4. **Performance** — `Promise.all` (parallel query), batch `inArray` (N+1 oldini olish)
5. **Edge case** — null, undefined, empty array
6. **Xavfsizlik** — SQL injection (Drizzle prepared statements), validation, authorization

---

## 🚨 KRITIK QOIDA — LARAVEL PARITY ROLE + ORG-SCOPE

**Asosiy qoida**: NestJS Laravel'ning **aynan o'zini** takrorlaydi — **parity birinchi o'rinda**.

### Qachon `OrgScopeService` qo'shamiz

✅ **FAQAT** Laravel side scope qo'llasa:
- Service'da `Model::query()->filter($user, $filters)` chaqirsa
- Yoki `whereHas('worker.position').filter($user, $filters)` chaqirsa
- Yoki Controller'da `->filter(auth()->user(), request()->all())` chaqirsa
- Yoki Model'da `scopeFilter` bor va u `paginate()`dan oldin chaqirilsa

→ NestJS'da `scope.whereOrg(...)` yoki `scope.activeWorkerExists(...)` qo'shamiz.

❌ **QO'SHMA** agar Laravel scope qo'llamasa:
- Laravel `->paginate()` qilsa, `.filter()` yo'q bo'lsa
- Faqat o'zining custom `where` clause'i bo'lsa
- Hech qanday `childIds` / `filterByOrganizations` ishlatmasa

→ NestJS'da ham scope qo'shilmaydi (parity buziladi aks holda).

### Manual instruktsiya bo'lsa

Developer aniq aytsa: **"shu endpoint'ga role + org-scope qo'sh"** — faqat shunda Laravel'da bo'lmasa ham qo'shiladi. Buni "Laravel bug" deb hisoblamaymiz va o'z tashabbusimiz bilan qo'shmaymiz.

### Tekshirish ro'yxati (har endpoint uchun)

Yangi yoki mavjud endpoint ustida ishlayotganda:

1. **Laravel controller + service + model'ni oldin o'qib chiq** — `.filter($user, ...)` chaqiruvi bormi?
2. **Bor bo'lsa** — NestJS'da OrgScopeService inject qilib, `scope.whereOrg(...)` ishlat
3. **Yo'q bo'lsa** — NestJS'da ham qo'shma (parity)
4. **Developer alohida aytsa** — manual qo'shamiz, aytmasa qo'shmaymiz

### Qaysi jadval column'iga `whereOrg` qo'llash

| Laravel pattern | NestJS metod |
|----------------|--------------|
| `Foo::query()->filter($user, $filters)` — table'da `organization_id` bor | `scope.whereOrg(foos.organization_id, filters)` |
| `whereHas('worker', fn ($q) => $q->whereHas('position', fn ($q) => $q->filter($user, $filters)))` | `scope.activeWorkerExists(table.worker_id, filters)` |
| `whereHas('workerPosition', fn ($q) => $q->filter($user, $filters))` | `scope.activePositionByIdExists(table.worker_position_id, filters)` |
| Custom subtree/visibility logic (masalan `Organization::getAllChildrenIds`) | `await scope.ids()` → manual `inArray(col, ids)` |

### Misol — Laravel scope qo'llagan endpoint

```typescript
// Laravel: Pensioner::query()->filter($user, $filters)->paginate(...)
async findAll(filters: QueryFooDto) {
  // ✅ Laravel scope qo'llagani uchun NestJS'da ham qo'shamiz
  const inScope = await this.scope.whereOrg(pensioners.organization_id, {
    organizations: filters.organizations,
    organization_id: filters.organization_id,
  });

  const where = and(notDeleted(pensioners), inScope, searchCond);
  // ...
}
```

### Misol — Laravel scope qo'llamagan endpoint

```typescript
// Laravel: VacationScheduleYear::query()->orderByDesc('id')->paginate(...)  
// — `.filter()` YO'Q
async findAll(filters: QueryFooDto) {
  // ❌ Scope qo'shilmaydi — Laravel ham qo'llamayapdi
  const where = and(notDeleted(vacation_schedule_years));
  // ...
}
```

---

## ASOSIY PATTERN — `OrgScopeService` (Laravel `QueryHelper::childIds` parity)

Bu **eng muhim** pattern. Laravel'da har bir HR endpoint `WorkerPosition::filter($user, $filters)` → `QueryHelper::filterByOrganizations` ishlatadi:
- `organization-admin` → barcha organizations
- `organization-leader` → o'z organizatsiyasi + subtree (NestedSet `_lft/_rgt`)
- default → faqat `user.organization_id`

### `OrgScopeService` foydalanish

Fayl: `src/common/database/org-scope.service.ts` — `PermissionModule` orqali **@Global** registratsiya qilingan, har joyda inject bo'ladi.

```typescript
import { OrgScopeService } from '@/common/database/org-scope.service';

@Injectable()
export class FooService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,   // ← inject
    // ... boshqa
  ) {}

  async findAll(filters: QueryFooDto) {
    // Laravel Foo::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(foos.organization_id, {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    });

    const where = and(
      notDeleted(foos),
      inScope,             // ← AND childIds + csv + single
      searchCond,
    );
    // ...
  }
}
```

### Qachon qaysi metod

| Holat | Metod |
|-------|-------|
| Jadval o'z `organization_id` columnga ega | `scope.whereOrg(table.organization_id, filters)` |
| Worker'ning ACTIVE position'i scope ichida bormi (Laravel `whereHas('worker.position').filter`) | `scope.activeWorkerExists(table.worker_id, filters)` |
| Spesifik `worker_position_id` faol va scope ichidami | `scope.activePositionByIdExists(table.worker_position_id, filters)` |
| Faqat scope ID array kerak (custom logic) | `await scope.ids()` |

### Antipattern (QILMA)

```typescript
// ❌ NOTO'G'RI — manual orgIds, Laravel scopeFilter parity buziladi
const orgIds = filters.organizations?.split(',').map(Number) ?? [];
const where = and(
  filters.organization_id ? eq(t.organization_id, filters.organization_id) : undefined,
  orgIds.length > 0 ? inArray(t.organization_id, orgIds) : undefined,
);
```

`childIds` (role-based) qo'shilmaydi — user 222 org'dagi yozuvlarni emas, BARCHA yozuvlarni ko'radi.

---

## QOIDALAR (DOIM RIOYA QILISH)

### 1. Response format (Laravel-style)

Barcha javoblar `ResponseInterceptor` orqali shunday qaytariladi:

```json
{ "message": true,  "error": false, "data": { ... } }   // success
{ "message": "...", "error": true,  "data": null }       // failure
```

Service oddiy object qaytaradi (`return { current_page, total, data }`) — interceptor `data` ichiga o'rab beradi.

### 2. Pagination — `per_page` response'da YO'Q

Laravel `paginate()` javobida `per_page` key qaytarmaydi (asosida bor, ammo `PaginateResource` chiqarib tashlaydi):

```typescript
// ✅ TO'G'RI
return {
  current_page: page,
  total: Number(total),
  data: rows.map(mapper),
};

// ❌ NOTO'G'RI — Laravel bilan body diff buziladi
return { current_page, per_page, total, data };
```

Response DTO'da ham `per_page!: number` BO'LMAYDI:
```typescript
export class FooListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [FooItemDto] }) data!: FooItemDto[];
}
```

### 3. DTO naming + class-validator

- `Create<Name>Dto`, `Update<Name>Dto`, `Query<Name>Dto` (Laravel'da `StoreRequest`, `UpdateRequest`, `IndexRequest`)
- `<Name>ItemDto`, `<Name>ListResponseDto` — response shape
- Query DTO `SearchPaginationQueryDto` ni extend qiladi (`page`, `per_page`, `search` keladi)

```typescript
export class QueryFooDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({ example: '151,154' })
  @IsOptional() @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 222 })
  @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;
}
```

### 3a. 🚨 snake_case — DOIM (request, response, DB, query)

Loyihada **hamma joyda** `snake_case` ishlatiladi — Laravel parity uchun. CamelCase YOZMA.

| Joy | Format | Misol |
|-----|--------|-------|
| Request DTO field | `snake_case` | `worker_id`, `organization_id`, `last_name`, `command_date`, `worker_position_id` |
| Response DTO field | `snake_case` | `current_page`, `total`, `created_at`, `post_short_name` |
| Query parametr | `snake_case` | `?per_page=10&organization_id=222&worker_position_id=5` |
| Drizzle schema column | `snake_case` | `worker_id: integer('worker_id')`, `created_at: timestamp('created_at')` |
| SQL fragment / raw query | `snake_case` | `sql\`worker_positions.organization_id\`` |
| Service method (TS) | `camelCase` | `findAll`, `buildVacationExcel`, `nextId` — JS konvensiyasi |
| Class nomi | `PascalCase` | `PensionerService`, `CreatePensionerDto` |

```typescript
// ✅ TO'G'RI
export class CreateWorkerDto {
  @ApiProperty() @IsString() last_name!: string;
  @ApiProperty() @IsString() first_name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() middle_name?: string;
  @ApiProperty() @Type(() => Number) @IsInt() organization_id!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() worker_position_id?: number;
}

// ✅ Response ham snake_case
return {
  id: r.id,
  last_name: r.last_name,
  first_name: r.first_name,
  organization_id: r.organization_id,
  created_at: r.created_at,
};
```

```typescript
// ❌ NOTO'G'RI — camelCase YOZMA
export class CreateWorkerDto {
  lastName!: string;       // ❌
  workerPositionId!: number; // ❌
}

// ❌ NOTO'G'RI — @Expose({ name: 'snake_case' }) bilan urinish
@Expose({ name: 'worker_id', toPlainOnly: true })
workerId!: string;       // ❌ ValidationPipe whitelist strip qiladi
```

**Sabab:** Laravel side hamma joyda `snake_case` — DB columnlari ham, JSON request/response ham. NestJS'da `ResponseInterceptor` avtomatik conversion qilmaydi — biz xom snake_case'da yozamiz.

**Drizzle schema:**
```typescript
export const workers = pgTable('workers', {
  id: serial('id').primaryKey(),
  last_name: varchar('last_name', { length: 100 }),
  first_name: varchar('first_name', { length: 100 }),
  organization_id: integer('organization_id'),
  created_at: timestamp('created_at').defaultNow(),
});
```

Drizzle column nomi va DB column nomi **ikkalasi ham snake_case** — TS field `workers.last_name` deb ishlatiladi (camelCase mapping yo'q).

### 4. Service method naming

| Operatsiya | Metod |
|-----------|-------|
| List | `findAll(filters)` |
| Detail | `findOne(id)` |
| Create | `create(dto)` |
| Update | `update(id, dto)` |
| Delete | `remove(id)` (soft-delete: `set { deleted_at: NOW() }`) |
| Export | `exportToTask(filters)` — `ExportTaskRunner` orqali |

### 5. Soft-delete — `notDeleted()` helper

```typescript
import { notDeleted } from '@/common/database/soft-delete.helper';

const where = and(notDeleted(foos), inScope, searchCond);
```

Manual `isNull(t.deleted_at)` o'rniga **doim** `notDeleted(t)` ishlat. Helper soft-delete column auto-detect qiladi.

### 6. Mapper — alohida fayl

Item shape katta bo'lsa (5+ field, nested object'lar) — `<name>.mapper.ts`:
```typescript
export const FooMapper = {
  async toItem(r: Row, lang: string, minio: MinioService): Promise<FooItemDto> {
    return {
      id: r.id,
      photo: await minio.fileUrl(r.photo),
      organization: r.org_id ? { id: r.org_id, name: r.org_name } : null,
      // ...
    };
  },
};
```

Mapper service ichida bo'lishi mumkin agar 3-4 maydon bo'lsa.

### 7. Worker search — `buildWorkerSearchCond` helper

Laravel `Worker::scopeSearchByFullName` parity:
```typescript
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
const searchCond = buildWorkerSearchCond(filters.search);
```

Direct `ilike(workers.last_name, ...)` YOZMA — qidiruv tartibi (last → first → middle → pin) Laravel bilan mos kelmaydi.

### 8. Multi-lang naming (organization, department)

Organization javobida `lang` ga qarab `name`/`name_ru`/`name_en` tanlanadi:

```typescript
organization: r.org_id ? {
  id: r.org_id,
  name: lang === 'ru' ? (r.org_name_ru ?? r.org_name)
      : lang === 'en' ? (r.org_name_en ?? r.org_name)
      : r.org_name,
  group: r.org_group ?? false,
} : null,
```

`lang` — `this.ctx.lang` (`RequestContext`) dan keladi. Header `Accept-Language: uz|ru|en`.

### 9. i18n xato xabarlari

```typescript
throw new BusinessException(404, this.i18n.t('messages.not_found'));
throw new BusinessException(409, this.i18n.t('messages.you_cannot_delete_a_document_that_has_been_approved'));
```

Hardcoded `"Not found"` YOZMA — `messages.not_found` key qo'shib 3 ta til faylini yangilash kerak: `src/i18n/{uz,ru,en}/messages.json`.

### 10. Auth + Permission

- `@Public()` — JWT bypass
- `@Permission('foo')` — Laravel `can:foo` parity (Spatie roles)
- `RequestContext` (`@/common/context/request.context`) — `ctx.user`, `ctx.user_or_fail`, `ctx.lang`

### 11. Performance — Promise.all + batch inArray

```typescript
// ✅ Parallel list + count
const [rows, [{ total }]] = await Promise.all([
  this.db.select(...).from(t).where(where).limit(perPage).offset(offset),
  this.db.select({ total: count() }).from(t).where(where),
]);

// ✅ Batch join (N+1 oldini olish)
const orgIds = [...new Set(rows.map(r => r.organization_id).filter(Boolean))];
const orgs = orgIds.length
  ? await this.db.select().from(organizations).where(inArray(organizations.id, orgIds))
  : [];
const orgMap = new Map(orgs.map(o => [o.id, o]));
```

### 12. PostgreSQL natural order (Laravel parity)

Laravel `paginate()` ko'pincha `ORDER BY` qo'shmaydi — PostgreSQL natural (insertion) order qaytaradi. NestJS'da xuddi shunday ishlash uchun **explicit `orderBy` YOZMA** agar Laravel'da yo'q bo'lsa:

```typescript
// ❌ — Laravel'da yo'q
.orderBy(asc(t.id))

// ✅ — natural order, Laravel bilan mos
.limit(perPage).offset(offset)
```

Laravel `orderByDesc('id')` ishlatsa — NestJS'da ham `orderBy(desc(t.id))`.

### 13. MAX(id)+1 insert (sequence emas)

Laravel parallel ishlayotgani uchun PostgreSQL sequence migrate qilish konflikt qiladi. Yangi yozuvlarda ID'ni manual:

```typescript
const [{ next_id }] = await tx.execute(sql`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM foos`);
await tx.insert(foos).values({ id: next_id, ... });
```

`nextId()` private helper service ichida saqlanadi.

---

## Module strukturasi

```
src/modules/hr/foos/
├── foo.module.ts          — @Module({ controllers, providers })
├── foo.controller.ts      — @Controller('api/v1/hr/foos')
├── foo.service.ts         — Business logic + DB queries
├── foo.mapper.ts          — (Optional) item shape mapper
└── dto/
    └── foo.dto.ts         — CreateFooDto, UpdateFooDto, QueryFooDto, FooItemDto, FooListResponseDto
```

### Controller pattern

```typescript
@ApiTags('HR / Foos')
@Controller('api/v1/hr/foos')
export class FooController {
  constructor(private readonly service: FooService) {}

  @Get()
  @Permission('foos')
  async findAll(@Query() filters: QueryFooDto) {
    return this.service.findAll(filters);
  }

  @Post()
  @Permission('foos')
  async create(@Body() dto: CreateFooDto): Promise<void> {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permission('foos')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFooDto): Promise<void> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permission('foos')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
```

---

## Mavjud reusable elementlar

### Common
- `BusinessException(status, message, data?)` — `@/common/exceptions/business.exception`
- `notDeleted(table)` — `@/common/database/soft-delete.helper`
- `OrgScopeService` — `@/common/database/org-scope.service`
- `RequestContext` (CLS) — `@/common/context/request.context`
- `@Permission('key')`, `@Public()`, `@CurrentUser()` — `@/common/decorators/*`
- `SearchPaginationQueryDto`, `PaginationQueryDto` — `@/common/dto/pagination.dto`
- `toLaravelTimestamp(date)`, `nowDb()` — `@/common/utils/datetime.util`
- `buildSuccess(message, data)` — `@/common/utils/response.util`
- `@Exists('table', 'column')` validator — `@/common/validators/exists.validator`

### Shared services
- `MinioService.fileUrl(path)` — S3 presigned URL (1800s expire)
- `MinioService.uploadFormFile(file, folder, exts, size, mb)` — multipart upload
- `MinioService.uploadBase64File(b64, folder, exts, kb)` — base64 upload
- `ExcelService.build({ creator, sheets })` — Excel buffer generator
- `ExportTaskRunner.run({ type, folder, build })` — fonda `UserExportTask` + DOCX/XLSX upload
- `ConvertService.docxToPdf(docx)` — DOCX → PDF (libreoffice)
- `PermissionService.getUserPermissions(userId)` — Spatie roles (cached)

### HR helpers
- `buildWorkerSearchCond(search)` — `@/modules/hr/_shared/worker-search.helper`
- `getFullPosition(opts)`, `getShortPosition(opts)` — `@/modules/hr/_shared/position-helper`

---

## Parity testing — har endpoint qo'shilgandan keyin

```bash
# Token (admin user)
UTN="1231294|0f143ff6660e92bec16ad14c06789a5f9515391f"

# Totals match (asosiy parity belgisi)
for ep in "hr/foos" "hr/bars"; do
  L=$(curl -s "http://localhost:8002/api/v1/$ep?page=1&per_page=10" \
        -H "Authorization: Bearer $UTN" -H "X-Auth-Type: sanctum" \
        | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["total"])')
  N=$(curl -s "http://localhost:8001/api/v1/$ep?page=1&per_page=10" \
        -H "Authorization: Bearer $UTN" -H "X-Auth-Type: sanctum" \
        | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["total"])')
  [ "$L" = "$N" ] && echo "OK $ep L=$L N=$N" || echo "DIFF $ep L=$L N=$N"
done

# Deep body diff (S3 URL signatura tashqari)
python3 << 'PY'
import json
from urllib.parse import urlparse
def norm(o):
    if isinstance(o, dict): return {k: norm(v) for k,v in o.items()}
    if isinstance(o, list): return [norm(x) for x in o]
    if isinstance(o, str) and 'X-Amz-' in o:
        p = urlparse(o); return f"{p.scheme}://{p.netloc}{p.path}"
    return o
l = json.load(open('/tmp/l.json'))
n = json.load(open('/tmp/n.json'))
print('MATCH' if json.dumps(norm(l), sort_keys=True) == json.dumps(norm(n), sort_keys=True) else 'DIFFER')
PY
```

### Headers (Laravel hybrid auth)
```
Authorization: Bearer {userId}|{plaintext}
X-Auth-Type: sanctum
Accept-Language: uz | ru | en   # response naming uchun
```

---

## MUHIM: O'zgarish qilishdan oldin so'rash

Bu paytlarda **OLDIN developerdan so'ra**:
- **DB schema o'zgartirish** — Laravel migration ham bor, ikkala app ta'sirlanadi
- **Common helper (`OrgScopeService`, `notDeleted`, `RequestContext`) o'zgartirish** — barcha endpoint'lar ta'sirlanadi
- **Response format / interceptor o'zgartirish** — frontend barcha pagelar buziladi
- **Guard / Permission decorator semantikasi o'zgartirish**
- **`@/common` ostidagi har qanday narsa**

So'ramasdan bajarish mumkin:
- Yangi endpoint qo'shish (mavjudga ta'sir qilmaydi)
- Bug fix (parity yaxshilanadi)
- Yangi modul qo'shish
- Service ichidagi private refactor

---

## Taqiqlar (Antipatternlar)

- **`per_page` response'da** — Laravel'da yo'q, parity buziladi
- **Manual `orgIds` filter** — `OrgScopeService.whereOrg` ishlat
- **`isNull(t.deleted_at)`** — `notDeleted(t)` ishlat
- **Hardcoded English error xabari** — `this.i18n.t('messages.key')`
- **Explicit `orderBy(asc(id))`** Laravel `orderBy` qo'llamagan joyda — natural order'ni buzadi
- **Direct `ilike(workers.last_name)` qidiruv** — `buildWorkerSearchCond` ishlat
- **Loop ichida DB query** — batch `inArray` bilan optimallash
- **Ketma-ket query** — `Promise.all` ishlat
- **PostgreSQL sequence** ID uchun — `MAX(id)+1` (parallel Laravel bilan konflikt)
- **camelCase field DTO/Drizzle/response'da** — barcha joyda `snake_case` (qoida 3a)
- **`@Expose({ name: 'snake_case' })` request DTO'da** — ValidationPipe whitelist strip qiladi. To'g'ridan-to'g'ri snake_case field yoz
- **`/api/v1/...` URL'larini o'zgartirish** — frontend Laravel route'ni kutadi
- **Sanctum token formatini buzish** — `{id}|{plaintext}` format saqlanadi

---

## Foydali fayllar

- `src/common/database/org-scope.service.ts` — childIds caching, whereOrg, activeWorkerExists
- `src/common/database/org-scope.helper.ts` — `resolveOrgScopeIds` (role → IDs)
- `src/common/database/soft-delete.helper.ts` — `notDeleted(table)`
- `src/common/interceptors/response.interceptor.ts` — `{message, error, data}` shape
- `src/common/filters/business-exception.filter.ts` — HTTP 200 + body status
- `src/common/exceptions/business.exception.ts`
- `src/common/context/request.context.ts` + CLS provider
- `src/modules/hr/_shared/worker-search.helper.ts` — full-name + pin search
- `src/modules/hr/_shared/position-helper.ts` — `getFullPosition`, `getShortPosition`
- `src/shared/permission/permission.service.ts` — `getUserPermissions(userId)` (Spatie parity)
- `src/shared/minio/minio.service.ts`
- `src/shared/export-task/export-task-runner.service.ts`
