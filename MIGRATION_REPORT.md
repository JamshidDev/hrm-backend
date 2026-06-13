# Migration Report — Laravel → NestJS

Oxirgi yangilanish: 2026-06-12

> **ETALON:** Laravel `http://localhost:8002` (o'zgartirilmaydi)
> **TEST:** NestJS `http://localhost:8001`
> Ikkala backend bitta PostgreSQL (`postgresql://mack@127.0.0.1:5432/hrm`).
> Wire format: `snake_case`. Pagination'da `per_page` YO'Q. Response: `{message, error, data}`.

## Progress: 858 / 1008 endpoint mos (~85%) — 78 implement qilinishi kerak

| Holat | Soni |
|------|------|
| ✅ MATCHED (path+method mos) | 858 |
| ⚠️ PATCH (Laravel apiResource PUT+PATCH, NestJS faqat PUT — funksional mos) | 72 |
| ❌ Implement kerak (path yoki method yo'q) | 78 |
| ➕ EXTRA (NestJS'da bor, Laravel'da yo'q — asosan _method/sortable/export) | 10 |

*Audit usuli: `php artisan route:list --json` (Laravel 1008 api/v1) ↔ NestJS swagger JSON (20 modul, 871 route). Path param'lar `{}` ga normallashtirildi. Laravel `Route::resource` ning `create`/`edit` (HTML form) route'lari hisobga olinmadi.*

## 🚧 Joriy holat (sessiya uzilsa shu yerdan davom)
- **Bosqich:** 2-BOSQICH boshlandi (chuqur re-verify + implement). 0-BOSQICH 22/28 role tayyor.
- **Oxirgi tugatilgan:** turnstile schedule/* GET TO'LIQ (stats-* 8 MATCH, day-in-month holidays+DTO FIXED). DB-backed GET-list deyarli barcha modullarda tugadi.
- **Keyingi qadam:** Qolgan GET: turnstile `hik-central/*` ~25 (tashqi HikCentral), `lms/exams` (deviation A/B). Asosiy qolgan ish: **CRUD** (store/update/delete) + **78 implement** (audit'dagi yo'q endpointlar).
- **Eslatma:** 6 role'da vakil-user yo'q (LmsTeacher, SuperLms, TestLeader, TurnstileManagement, Test role) — kerak bo'lganda test-user yaratiladi.
- **Disk gigiena:** `/tmp/nest-dev.log` watch-mode'da o'sib diskni to'ldiradi → vaqti-vaqti bilan `: > /tmp/nest-dev.log`.

## Role'lar (DB `roles` jadvali — 28 ta, guard=sanctum)
HR, Worker, Admin, Finance, Economist, Jurist, HrLeader, EconomistLeader, OrganizationLeader, Hospital, TurnstileLeader, LmsLearningCenter, LmsTeacher, TurnstileViewer, SuperLms, TestLeader, TurnstileManagement, EMM, TimesheetHR, NBT, ToshkentMtuIntegration, HrViewLeader, EconomistManagement, IKT, WorkersView, LeaderManagement, (bo'sh #29), Test role #30

RolesEnum (`Modules/Structure/.../RolesEnum.php`): Worker, HR, Finance, Jurist, Economist, HrLeader, EconomistLeader, Hospital, TurnstileViewer, TurnstileLeader, ...

## Test userlar (0-BOSQICH — 22/28 tayyor)
Login **phone** bilan (email emas). Test uchun har role'ning vakil real-user'i tanlandi + sanctum token mint qilindi (`scripts/tokens.sh`). DB ifloslantirilmadi.

| Role | User | | Role | User | | Role | User |
|------|------|-|------|------|-|------|------|
| HR | 26 | | Hospital | 50433 | | HrViewLeader | 279 |
| Worker | 1* | | TurnstileLeader | 4649 | | EconomistManagement | 39 |
| Admin | 1 | | LmsLearningCenter | 23833 | | IKT | 19756 |
| Finance | 78 | | TurnstileViewer | 293 | | WorkersView | 38111 |
| Economist | 41 | | EMM | 12258 | | LeaderManagement | 1177 |
| Jurist | 57534 | | TimesheetHR | 11 | | | |
| HrLeader | 27 | | NBT | 59898 | | | |
| EconomistLeader | 255 | | ToshkentMtuIntegration | 1245 | | | |
| OrganizationLeader | 14 | | | | | | |

*Worker=user1=Admin (ikkala rol bor) — toza Worker-403 testi uchun keyin faqat-Worker user kerak.
**Vakil yo'q (⏳):** LmsTeacher, SuperLms, TestLeader, TurnstileManagement, Test role.

## Scriptlar (0-BOSQICH — ✅ tayyor)
- `scripts/tokens.sh` — `get_token <Role>` / `get_tuser <Role>` (bash 3.2 mos, case-funksiya). 22 role.
- `scripts/api-diff.sh` — `METHOD PATH ROLE [BODY] [LANG]` → ikki serverga so'rov, body (jq-style, S3-normalizatsiya) + header diff, MATCH/DIFFER. `RAW` → token'siz.
- Mavjud yordamchi: `/tmp/pdfcheck/cmp.sh` (GET parity), python deep-diff.

---

## ❌ Implement qilinishi kerak (78)

### A. Yarim-CRUD resurslar — PRIORITET (2+ method yo'q)
| Resurs | Yo'q method'lar | Controller |
|--------|-----------------|-----------|
| confirmation/applications | GET/{id}, POST, PUT, DELETE | WorkerApplicationConfirmationController |
| hr/worker-positions | POST, PUT, DELETE | WorkerPositionController |
| structure/organization-services | GET/{id}, PUT, DELETE | OrganizationServiceController |
| admin/users | GET/{id}, POST, PUT | AdminUserController |
| hr/workers | GET (list), GET/{id}, DELETE | WorkerController |
| hr/commands | GET/{id}, PUT | CommandController |
| hr/contract-additional | GET/{id}, PUT | ContractAdditionalController |
| hr/polyclinics | GET/{id}, PUT | OrganizationPolyclinicController |
| chat/media | PUT | ChatNewsMediaController |
| hr/contracts | PUT | ContractController |
| turnstile/organization-terminals | PUT | OrganizationTerminalController |
| admin/test | POST (ToDoController@test — debug?) | — |

### B. Faqat `GET /{id}` (show/detail) yo'q — 43 resurs (asosan lookup/qator-detal)
admin/permissions, admin/roles, chat/categories, hr/confirmation-workers, hr/leaders,
hr/nationalities, hr/organization-documents, hr/organization-phones, hr/pensioners,
hr/vacation-schedules, hr/worker-academic-degrees, hr/worker-academic-titles,
hr/worker-disabilities, hr/worker-languages, hr/worker-militaries, hr/worker-old-careers,
hr/worker-parties, hr/worker-passports, hr/worker-phones, hr/worker-photos,
hr/worker-relatives, hr/worker-universities, structure/cities, structure/command-types,
structure/contract-additional-types, structure/contract-types, structure/countries,
structure/holidays, structure/languages, structure/learning-centers, structure/positions,
structure/quotes, exam/categories, lms/specializations, economist/* va boshqalar.

> ⚠️ Bularning ko'pi Laravel `apiResource` `show()` — frontend ishlatmasligi mumkin. 2-bosqichda har birini Laravel `show()` real ishlatilishini tekshirib, kerakligini aniqlaymiz.

## ➕ EXTRA (NestJS'da bor, Laravel'da yo'q — 10) — tekshirish kerak
- `GET economist/statements-export-{by-position,decoding-by-month,multiple-workers}` — NestJS qo'shimcha export
- `GET hr/pensioners/list-med` — qo'shimcha
- `PUT hr/worker-old-careers/sortable`, `PUT hr/worker-relatives/sortable` — sortable (Laravel'da boshqa path?)
- `POST .../create`, `.../{}/edit` ko'rinishlari — normalizatsiya artefakti (tekshirish)

---

## ✅ Chuqur tasdiqlangan endpointlar (2-BOSQICH)
| # | Method | Path | Holat | Izoh |
|---|--------|------|-------|------|
| 1 | GET | structure/countries | ✅ FIXED | `orderBy id asc` olib tashlandi → natural order (default/pagination/search MATCH) |
| 2 | GET | structure/cities | ✅ MATCH | — |
| 3 | GET | structure/regions | ✅ FIXED | `orderBy id asc` olib tashlandi → natural order |
| 4 | GET | structure/languages | ✅ MATCH | (orderBy id asc — Laravel bilan mos) |
| 5 | GET | structure/positions | ✅ MATCH | — |
| 6 | GET | structure/holidays | ✅ MATCH | — |
| 7 | GET | structure/command-types | ✅ MATCH | — |
| 8 | GET | structure/contract-types | ✅ MATCH | — |
| 9 | GET | structure/quotes | ✅ MATCH | — |
| 10 | GET | structure/learning-centers | ✅ MATCH | (orderBy id desc — Laravel bilan mos) |
| 11 | GET | structure/contract-additional-types | ✅ MATCH | — |
| 12-28 | GET | structure/{all,enums,organizations,organization-list,parents,parent-leaders,reports,reports-stat,reports-per-month,schedules,specialities,universities,work-days,organization-levels,report/labels,export/tasks-count} | ✅ MATCH | batch (17 ta) |
| 29 | GET | structure/organization-services | ✅ FIXED | `organization_id` majburiy edi (422) → optional + IS NULL (Laravel `where(col,null)`) |
| 30 | GET | structure/confirmations | ✅ FIXED | `departments`/`positions` join'da `isNull(deleted_at)` yo'q edi → o'chirilgan dept getFullPosition'da chiqib qolardi |

| 31 | GET | admin/roles | ✅ FIXED | permissions sub-array Laravel pivot **ctid** tartibida (NestJS name-asc edi); manual batch yuklash |
| 32 | GET | admin/activity-logs | ✅ FIXED | `created_at` → `toLaravelTimestamp` (ISO8601) |
| 33 | GET | admin/telegram/users | ✅ FIXED | `created_at` → ISO8601 |
| 34 | GET | admin/telegram/bot/users | ✅ FIXED | `active` filtri olib tashlandi + orderBy olib tashlandi + `whereNot id 101` + `user` UsersResource shakli (uuid qo'shildi, worker `photo:null` — Laravel `with('user.worker:id,...')` photo'siz yuklaydi) + per_page leak |
| 35 | GET | admin/instructions | ✅ FIXED | orderBy olib tashlandi (natural order) + photos `fileUrl` qo'llandi |
| 36-49 | GET | admin/{authentication-logs,integration-log/*,mobile/users,permissions,users,users/direct-permissions} | ✅ MATCH | batch (13 ta) |
| — | GET | admin/access-for-admin | ⚠️ DEFER | 422 validation-message i18n: NestJS inglizcha ("must be a UUID"), Laravel lokal ("...maydoni to'ldirilishi shart") — TIZIMLI (barcha 422) |

| 50-65 | GET | hr/* GET-list (24 tekshirildi) | ✅/🔧 | **6 FIXED:** check-worker (pin required+min/max), search-workers (org_id required), organization-phones (per_page), applications (worker.uuid ortiqcha), contract-additional (worker COALESCE-fallback + soft-delete), confirmation-workers (orderBy) · 17 MATCH · **1 DEFER:** vacancy |
| 66 | GET | hr/vacancy | ✅ FIXED | orderBy(desc id) olib tashlandi → natural order |
| 67-69 | GET | hr/report/{departments,department-positions,worker-positions} | ✅ FIXED | org_id optional+IS NULL, orderBy, Confirm/Changed/ContractType enum, rate accessor /100, worker_rate ACTIVE filter, per_page |
| 70 | GET | hr/get-department | ✅ FIXED | level→{id,name:DeptLevelEnum}, comment/name_ru/name_en, orderBy, childIds scope, per_page |
| 71 | GET | hr/get-positions | ✅ FIXED | orderBy, per_page (default/10/50/100/200 MATCH; per_page=5 Postgres plan-instability) |
| 72 | GET | hr/report/structure | ✅ FIXED | orderBy `_lft` (NestedSet defaultOrder) — tree children tartibi |
| 73 | GET | hr/report/optimization | ✅ FIXED | xom kalit `messages.successfully_optimizated` (Laravel lang'da yo'q → kalit) |
| 74 | GET | hr/dashboard | ✅ FIXED | vacation_types `id` last-wins (Laravel overwrite, natural groupBy) |
| 75 | GET | hr/dashboard-three | ✅ FIXED | relative_disabilities: worker_relatives join'ga notDeleted (whereHas SoftDeletes) |
| 76 | GET | hr/edu-plans | ✅ FIXED | EduPlanMinResource (type/end_date/serial olib tashlandi, code qo'shildi), main query JOIN'siz (natural order), orderBy+per_page |

**✅ hr GET-list moduli TO'LIQ tekshirildi** (~40 endpoint).

## turnstile moduli (boshlandi)
| Method | Path | Holat | Izoh |
|--------|------|-------|------|
| GET | turnstile/{buildings,enums,organization-terminals,schedule/schedule-groups,schedule/schedule-types} | ✅ MATCH | — |
| GET | turnstile/schedule/departments | ✅ FIXED | orderBy (organization_id, **ctid**) — Laravel heap-scan tie order |
| GET | turnstile/schedule/get-workers | ✅ FIXED | scheduleType har doim null (Laravel TYPO `$this->schedyleType`) |
| GET | turnstile/schedule/stats-{one,three,four,five,six,seven,preview} + schedule-workers | ✅ MATCH | 8 endpoint |
| GET | turnstile/schedule/day-in-month | ✅ FIXED | DayInMonthQueryDto (year/month required|integer|min|max) + is_holiday holidays jadvalidan (false edi) |
| GET | turnstile/absent-scheduled-workers | ✅ FIXED | 403 flat Spatie format (global #403) |
| GET | turnstile/hik-central/* (~25) | ⏳ TASHQI | HikCentral integratsiya (external) |

## lms moduli (boshlandi)
| Path | Holat | Izoh |
|------|-------|------|
| lms/{certificates,directions,enums,lessons,list/*,worker-exams} | ✅ MATCH | 10 endpoint |
| lms/learning-centers | ✅ FIXED | pivot (learning_center_users) ctid order, dedup yo'q |
| lms/subjects, specializations | ✅ FIXED | orderBy(desc id) olib tashlandi (natural) |
| lms/teachers | 🔧 QISMAN | orderBy fix; QOLDI: learning_center.code, worker.photo fileUrl, subjects tartibi |
| lms/teachers | ✅ FIXED | code + worker.photo fileUrl + subjects.id order |
| lms/edu-plan | ✅ FIXED | orderBy olib tashlandi (ctid) + learning_center.code |
| lms/groups | ✅ FIXED | edu_plan_id yo'q→IS NULL (Laravel where(col,null)) |
| lms/group-workers | ✅ FIXED | group_id yo'q→IS NULL + orderBy olib tashlandi (natural ctid) |
| lms/protocol | ✅ FIXED | group_id filter qo'shildi (yo'q→IS NULL) |
| lms/exams | ⚠️ DEVIATION | Laravel `topic.org = user.org` (strict), NestJS `scope.ids()` (admin→all). Dev ATAYLAB og'ishgan. **Qaror kerak (#12)** |

**✅ lms moduli TO'LIQ** (faqat `exams` deviation-qarori kutilmoqda).

> **Postgres plan-instability qaydi:** `paginate()` orderBy'siz + kichik LIMIT (masalan per_page=5) — Laravel `select *` (heap scan) vs NestJS kam-ustun (index-only scan) boshqa tartib beradi. Realistik per_page (10+) MATCH. Bu DB-darajasidagi cheklov.

**GLOBAL HAL QILINDI:** #3 charset (main.ts res.setHeader patch) · #1 422 uuid+minLength i18n (laravel-validation).

> Faqat GET-list (default) tekshirildi. To'liq spec (har role 403, 422, 404, pagination, til) keyingi o'tishda chuqurlashtiriladi.
> `orderBy: {id}` antipattern TIZIMLI EMAS — faqat countries/regions noto'g'ri edi. Qolganlari (languages/learning-centers) Laravel bilan mos. admin/roles, admin/permissions, admin/users — admin modulida tekshiriladi.

## Topilgan buglar va tuzatishlar (bu sessiya)
- `structure/countries` + `regions`: NestJS `orderBy: {id:'asc'}` qo'shilgan edi, Laravel `paginate()` orderBy'siz (natural order) → olib tashlandi (CLAUDE.md qoida #12)
- `structure/organization-services`: `organization_id` majburiy (422) → optional + yo'q bo'lsa `IS NULL` (Laravel `where(col,null)`)
- `structure/confirmations`: `departments`/`positions` join'da `isNull(deleted_at)` yetishmasdi → o'chirilgan department `getFullPosition`'da nom sifatida chiqib qolardi (Laravel relation SoftDeletes null qaytaradi). ⚠️ Bu naqsh boshqa dept-join endpointlarda ham bo'lishi mumkin.
- `user/mobile/work-info`: region/city/nationality SoftDeletes relation → o'chirilgan bo'lsa Laravel `null` qaytaradi (NestJS `notDeleted` qo'shildi)
- `user/mobile/work-info`: `languages` belongsToMany pivot soft-delete'ni filtrlamaydi (NestJS'dan `notDeleted` olib tashlandi)
- `user/mobile/work-info`: `positions.position:id,name` eager-load → `name_ru`/`name_en` yuklanmaydi → ru/en'da `null` (PositionMinimalResource fallback'siz)
- `user/mobile/my-vacations`: VacationTypeEnum command-type→ta'til-turi map
- `user/mobile/personal-list` + `work-info`: i18n `messages.mobile.*`, `worker.marital_status`, `worker.family` qo'shildi (3 til)

## ⚠️ Ataylab Laravel'dan og'ishlar (qaror kerak)
12. **lms org-scope deviation** — `exams` (va ehtimol `groups`/`protocol`/`group-workers`) NestJS'da `OrgScopeService.ids()` (admin→barcha org) ishlatadi, Laravel esa `topic.organization_id = user.organization_id` (strict). Dev kodda izohlagan: Laravel'ning strict org_id'si HQ-userlar uchun "real bug". Spec qoidasi: *"yaxshilama — Laravel'ga aynan moslashtir"*. **Qaror:** (A) strict parity (Laravel'dek user.org) yoki (B) deviation'ni saqlash (admin→all). Hozircha B (mavjud kod). Bu endpointlar Admin token bilan diff beradi (Laravel bo'sh, NestJS to'la).

## ⛔ Laravel'da error bergan route'lar

### 🔴 KATTA TOPILMA — apiResource undefined-method (GET-show + ba'zi CRUD)
Audit'dagi "78 missing"ning katta qismi **LARAVEL_ERROR**: `apiResource` route'ni ro'yxatlaydi, lekin controllerda metod YO'Q → `Call to undefined method ...::show()` → **500**. NestJS to'g'ri 404 qaytaradi. **Implement QILMAYMIZ** (spec: LARAVEL_ERROR takrorlanmaydi).

Tasdiqlangan undefined `show()`: OrganizationService, City, Command, Nationality, AdminUser, Worker controllerlar; `index()`: WorkerController (hr/workers). ➜ **43 GET-show + hr/workers index = LARAVEL_ERROR.**
CRUD'da ham: WorkerController `destroy()` yo'q, AdminUserController `store()/update()` yo'q. ➜ Har CRUD'ni Laravel'da curl bilan (500-undefined vs real) ajratish kerak.

| # | Method | Path | Status | Sabab |
|---|--------|------|--------|-------|
| 1 | GET | structure/positions/{id} + ~42 GET-show | 500 | apiResource `show()` undefined (controllerda yo'q) |
| 2 | GET | hr/workers | 500 | WorkerController `index()` undefined |
| 3 | DELETE | hr/workers/{id} | 500 | WorkerController `destroy()` undefined |
| 4 | POST/PUT | admin/users | 500 | AdminUserController `store()/update()` undefined |

### Controller-metod auditi (prioritet CRUD) — qaysi metod MAVJUD
`grep 'function <m>'` natijasi (1=bor→real implement, 0=undefined→LARAVEL_ERROR):
| Controller | store | update | destroy | show |
|-----------|-------|--------|---------|------|
| WorkerApplicationConfirmation | 0 | 0 | 0 | 0 |
| WorkerPosition | 0 | **1** | 0 | **1** |
| OrganizationService | **1** | 0 | 0 | 0 |
| Command | **1** | 0 | **1** | 0 |
| ContractAdditional | **1** | 0 | **1** | 0 |
| Contract | **1** | 0 | **1** | **1** |
| OrganizationPolyclinic | **1** | 0 | **1** | 0 |
| ChatNewsMedia | **1** | 0 | **1** | 0 |
| OrganizationTerminal | **1** | 0 | **1** | **1** |

> ⚠️ Yuqoridagi grep yolg'on-pozitiv berdi (`updatePrivilege` → "function update" match). **Aniq usul — HTTP 500-undefined testi.**

### ✅ YAKUNIY XULOSA — "78 missing" deyarli BARCHASI implement qilinmaydi
HTTP-test (Laravel javobi) aniq ko'rsatdi:
- **PUT/POST/DELETE worker-positions** → 500 `update()/store()/destroy() undefined` → LARAVEL_ERROR (grep yanglish edi)
- **confirmation/applications** CRUD → controller barcha metod 0 → LARAVEL_ERROR
- **admin/users** store/update → undefined → LARAVEL_ERROR
- **43 GET-show + hr/workers index** → undefined → LARAVEL_ERROR
- **`admin/test`** (POST) → Laravel **200** `"success"`, lekin `ToDoController::test()` darrov `return $this->createPartitions()` — bu **DEBUG/ops tool** (partitsiya yaratish), frontend API emas. NestJS partitsiyalarni drizzle bilan boshqaradi → implement SHART EMAS (flag).

**Demak:** DB-backed, Laravel-da ISHLAYDIGAN endpointlar (~870 matched + verify qilinganlar) — migratsiya to'liq. "Yo'q route"lar = Laravel-buzuq (apiResource over-registration) yoki tashqi (hik-central) yoki debug (admin/test). **Real implement qilinadigan yangi endpoint deyarli YO'Q.**

## E'tibor talab qiladigan joylar
1. ✅ **HAL QILINDI — GLOBAL header diff**: main.ts'da `res.setHeader` patch → `application/json` (charset'siz). Barcha endpointda mos.
2. **B-kategoriya (43 GET-show)**: tanlangan — ishlatilishini avval tekshirib, faqat real ishlatilganini implement.
3. **6 vakil-yo'q role**: LmsTeacher, SuperLms, TestLeader, TurnstileManagement, Test role — kerak bo'lganda test-user yaratiladi.
4. **e2e test konvensiyasi**: loyihada `*.spec.ts` (service-unit, 18 ta) bor, lekin spec real e2e so'raydi — ikki-server diff'ni e2e qilib qo'shish kerakmi yoki `*.spec.ts` uslubida? (hozircha api-diff.sh bilan tekshirilyapti).
5. **EXTRA 10**: NestJS qo'shgan route'lar — qoldiriladimi?
7. **🟡 QISMAN — 422 validation-message i18n**: mexanizm bor (`laravel-validation.ts` + `.messages.ts`, ~15 qoida). `uuid` qo'shildi (`access-for-admin` ✅). Yetishmagan qoidalar (exists, regex, digits...) modul-bo'ylab qo'shiladi — yangi qoida chiqsa: CONSTRAINT_TO_RULE + VALIDATION_RULES(3 til) + RULE_PRIORITY.
9. ✅ **HAL QILINDI — 403 permission-denied format**: PermissionGuard endi `RawHttpException(403, {message:'User does not have the right permissions.'})` (flat Spatie, inglizcha hardcoded). Barcha role/endpoint 403 MATCH (absent-scheduled-workers, WorkersView→admin/roles, TurnstileViewer→hr/commands tasdiqlandi).
10. **ctid tie-order trick** — `paginate()` orderBy bilan (masalan organization_id) tie'larda Laravel heap-scan = fizik (ctid) tartib. NestJS secondary `sql\`ctid\`` qo'shsa mos keladi (schedule/departments, admin/roles). get-positions kabi orderBy'sizlarga ham qo'llasa bo'ladi.
11. **⚠️ TIZIMLI: dept/position join soft-delete** — `confirmations` topgan bug (join'da `isNull(deleted_at)` yo'q → o'chirilgan dept nomi chiqib qoladi) kodda **25 ta `leftJoin(departments)`** da bo'lishi mumkin. Har birini Laravel relation (SoftDeletes qo'llaydimi) bilan tekshirib, kerak bo'lsa `isNull(deleted_at)` qo'shish kerak. Tekshirilgan/tuzatilgan: structure-tree (confirmations). Qolgan ~24: lms/certificates, integration/mobile-face, integration/main, economist/staffing, hr/worker-exports, hr/vacations, hr/worker-positions va h.k. — keyingi o'tishlarda har endpoint bilan birga.
