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
- **Oxirgi tugatilgan:** sweep 🔴 real total-diff — **14/14 FIXED** (hammasi runtime MATCH). Faqat `economist/statements-count` count-scope qoldi (shape fixed).
- **Keyingi qadam:** (1) statements-count count-scope · (2) 🟡 L=422 param-validatsiya (~6) · (3) 🟡 L=401 auth-artefakt tekshiruvi · (4) 🟢 stub mobil endpointlar (implement).
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
| exam/{topics,categories,results,worker-exams} | ✅ MATCH | **Deviation #12 TEKSHIRILDI → strict-parity ALLAQACHON bor.** Laravel: topics/categories=`where(user_id)`, results=`hasPermissionTo('hr-workers')` ? `allowedOrganizations()` (=`QueryHelper::childIds`) : `topics.user_id`. NestJS aynan shu: topics `eq(user_id)`, categories `user_id`+`whereOrg`(=filterByOrganizations), results hasHrWorkers-branch + `scope.ids()`(=childIds) + else `topics.user_id`. `scope.ids()` ≡ `childIds` ≡ `allowedOrganizations()` — **admin→all bu Laravel'ning O'ZIDA shunday** (yaxshilash EMAS). Runtime (admin): topics 5/5, categories 5/5, results 3515/3515, worker-exams 3/3 MATCH. Qaror A (strict) — kod o'zgarishi shart emas. |
| exam/not-passed-workers | ⛔ LARAVEL_ERROR | Laravel 500 "Server Error" (barcha param variantida). NestJS export-job qaytaradi. Match QILINMADI. |

**Eslatma (exam empty-childIds edge):** Laravel `if($user->allowedOrganizations())` — childIds bo'sh `[]`/`null` bo'lsa falsy → whereIn YO'Q → BARCHA row (xavfli Laravel-quirk). NestJS `else FALSE` (0 row). Real userlarda (admin/hr-workers) childIds bo'sh emas → divergensiya yuzaga kelmaydi; bu edge'ni ataylab takrorlamadik (zararli bug — LARAVEL_ERROR ruhida).

**✅ lms + exam moduli TO'LIQ** (deviation #12 hal qilindi — strict parity tasdiqlandi).

> **Postgres plan-instability qaydi:** `paginate()` orderBy'siz + kichik LIMIT (masalan per_page=5) — Laravel `select *` (heap scan) vs NestJS kam-ustun (index-only scan) boshqa tartib beradi. Realistik per_page (10+) MATCH. Bu DB-darajasidagi cheklov.

**GLOBAL HAL QILINDI:** #3 charset (main.ts res.setHeader patch) · #1 422 uuid+minLength i18n (laravel-validation).

> Faqat GET-list (default) tekshirildi. To'liq spec (har role 403, 422, 404, pagination, til) keyingi o'tishda chuqurlashtiriladi.
> `orderBy: {id}` antipattern TIZIMLI EMAS — faqat countries/regions noto'g'ri edi. Qolganlari (languages/learning-centers) Laravel bilan mos. admin/roles, admin/permissions, admin/users — admin modulida tekshiriladi.

## CRUD-validation parity (POST/PUT 422) — faza boshlandi
| Resurs | Holat | Muammo |
|--------|-------|--------|
| structure/countries, positions, languages, learning-centers | ✅ MATCH | — |
| lms/subjects, directions | ✅ MATCH | — |
| structure/cities, regions | ✅ FIXED | region_id/country_id @IsNotEmpty (required) |
| structure/holidays | ✅ FIXED | holiday_date + type @IsNotEmpty |
| lms/specializations | ✅ FIXED | direction_id @IsNotEmpty |
| hr/polyclinics | ✅ FIXED | required\|array — @IsNotEmpty+@IsArray (ortiqcha validator olib tashlandi) |
| structure/command-types, contract-types, contract-additional-types | ✅ FIXED | **Multipart** store 422. `document-type.validation.ts` qo'lda `validateDocumentTypeStore(type, organizations, file)` → `LaravelValidationException` (type/organizations required, file required\|mimes). Builder'ga `mimes` rule + `:values` placeholder qo'shildi. Parity: 3 endpoint × 3 til × {empty, type-only, type+orgs, wrong-ext} = 18/18 MATCH (suffiks `(and N more errors)` + per-field `errors` + `doc, docx` mimes — bayt-bayt). |
| structure/quotes POST | ✅ FIXED | `quote.validation.ts` — `validateQuoteStore()` flat dotted-key (`text.uz`...) synthetic `ValidationError[]` → builder Laravel-format yasaydi (humanize "text.uz" o'zgarmaydi). `@Body()` loose tip → global pipe skip (aks holda `author must be object`). 6 kalit mustaqil `required\|string`, rule-tartibi text→author. Parity 7/7: empty(uz/ru/en)/partial/text-only/non-string/text=string MATCH. Happy-path create OK. |
| structure/quotes PUT | ✅ FIXED | `validateQuoteUpdate()` — `sometimes\|string`: faqat MAVJUD kalitlar tekshiriladi (required emas), faqat berilgan field yoziladi (JSON column REPLACE — Laravel `$q->update($validated)` empirik tasdiqlandi: en yo'qoladi, tegilmagan field qoladi). 404 (findByIdOrFail) validate'dan oldin. Parity 6/6 — response + stored JSON ikkalasi MATCH (partial/full/empty/both/non-string-422/text=string-skip). |
| hr/nationalities POST | ⛔ LARAVEL_ERROR | store() undefined (500) |

## Multi-role 403 parity — PERMISSION-MAPPING AUDIT
**Usul:** Laravel `php artisan route:list --json` → har route'ning `PermissionMiddleware:X` (authoritative). NestJS controllerlarni parse → route→`@Permission`. Ikkala app BIR DB (Spatie) → permission NOMI mos bo'lsa, har rol uchun 403/200 avtomatik bir xil. 500 Laravel perm-route, 21 distinct perm.

**Topildi: 74 mismatch.** Fix qilingan:
- **19 DIFF (NestJS boshqa/torroq perm)** ✅ — `filter` (5 get-*), `department-positions` write (`hr`), `worker-positions` read+write (`hr`), `extra/department/locations` (`extra-worker-user`). DB role-set divergensiyasi tasdiqlandi (`filter`≠`hr` har ikki yo'nalishda; finer-perm'lar `hr` subset → NestJS noto'g'ri 403). Runtime: filter-not-hr 200/200, hr-not-filter 403/403 MATCH.
- **26 integration NONE** ✅ — Laravel `sanctum + permission:integration`, NestJS faqat AuthHybridGuard edi (perm tekshiruvsiz → ruxsatsiz user 200). 8 controllerga `PermissionGuard + @Permission('integration')` qo'shildi; salary/check uchun OR-perm (`integration|integration-worker-salary`/`-info`). `PermissionGuard` `|` OR-semantikasini qo'llab-quvvatlaydi (Spatie parity). Runtime 403 JSON body MATCH.
- **3 hr/enums NONE** ✅ — `enums-extras.controller` → `@Permission('hr')`.

- **26 admin/exam NONE** ✅ — `users-write` (deploy/integration-log/mobile-users/telegram → class-level), `instructions|instructions-write` (instruction.controller class-level, GET list override `instructions`), `document-view-exam-results` (exam result — FAQAT `worker-exams-results/:uuid` method-level, qolgan exam route'lar Laravel'da ham perm'siz → class-level QILINMADI). Runtime: admin 200/200, low-priv 403/403 MATCH.

**✅ NATIJA: 74/74 mismatch FIXED. DIFF=0, NONE=0** (500 Laravel perm-route'dan nest-map'da bor 387 tasi to'liq mos).
**113 route Laravel-perm bor lekin nest-map'da yo'q** — asosan `/create`+`/{id}/edit`+`/{id}` show (apiResource over-registration = LARAVEL_ERROR, NestJS 404, oldindan hujjatlangan).
**Eslatma:** non-JSON `Accept` header'da Laravel 403 HTML qaytaradi (Symfony), NestJS JSON — API client'lar doim `Accept: application/json` yuboradi, shu holda body bayt-bayt mos.

## Keng parity sweep (admin token, 315 GET list endpoint)
`scripts` orqali avtomatik: status + total/shape signature, L vs N. **Natija: MATCH=240, DIFFER=51, LARAVEL_ERR=24.** Triage (keyingi continue-ct work-list):

**🔴 Real total/data diff — 14/14 ✅ FIXED:**
`lms/exams` (deviation #12, strict org) · `news` (status 1) · `hr/vacations` (activeWorkerExists) · `extra/users` (position status=2) · `document/applications` (noto'g'ri jadval→delegatsiya) · `exam/filter/topics` (topic_organizations EXISTS) · `hr/dashboard/meds` (korrelatsiya subquery) · `hr/edu-plans/attached-workers` (whereHas worker_position.worker soft-delete) · `telegram/messages` (status=2) · `vacancies/organizations` & `vacancies/report` (to>=now-1day) · `worker-application/positions` (status=2) · `worker-application/statistics` (worker_applications groupBy confirmation + bare massiv @RawResponse) · `hr/dashboard/worker-relative-disabilities/preview` (wr.deleted_at IS NULL)
- ⚠️ `economist/statements-count`: shape FIXED (scalar) lekin **count-qiymati hali farq** (L=0 scoped, N=1.8M all) — Laravel `count($validated,$user)` filtr/scope qo'llaydi; ALOHIDA fix kerak (qolgan yagona 🔴).

**🟡 Auth-artefakt (`L=401`):** integration/* · telegram/{menu,profile,petition-types} · vacancies/{applications,careers,dashboard,educations,profile} · economist/telegram/* — Laravel boshqa auth (hmac/bot/site) bilan admin sanctum token'ni rad etadi; NestJS 200 beradi. **Tekshirish:** NestJS ham shu auth'ni talab qilishi kerakmi (juda permissive bo'lishi mumkin).

**🟡 Param-artefakt (`L=422`):** economist/upload-histories · user/mobile/{my-resume,turnstile-events,turnstile-show-stats} · user/organization-hr · document/files · turnstile/hik-central/worker-access-levels — Laravel required query-param kutadi (422), NestJS param'siz 200. **Validatsiya yetishmaydi.**

**🟢 Stub shape diff (ma'lum, mobil):** user/me · user/mobile/{documents,last-event,turnstile-stats,turnstile-events,turnstile-show-stats} · telegram/{menu/get-service,profile} — NestJS `stub` field qaytaradi (to'liq implement qilinmagan mobil/telegram).

**⛔ LARAVEL_ERR (24):** chat/{media,translations} · document/{history,messages,show,users,base64} · economist/{statement-decoding-organizations,statements-by-positions,statements-multiple-workers} · exam/not-passed-workers · hr/{vacation-schedules-not-included,worker-passports,worker-relative-disabilities,workers} · signature/challenge · timesheet/check-worker · turnstile/{hik-central/*,terminal-logs} · user/socket/verify-token · worker-application/confirmations — Laravel 500, match QILINMAYDI (LARAVEL_ERROR).

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
12. **org-scope deviation — ✅ HAL QILINDI (A: strict parity).** IKKI alohida narsa aralashgan edi:
    - **`exam/*` moduli** (Exam: topics/categories/results/worker-exams): tekshiruvda allaqachon strict-parity. Laravel `Topic/ExamCategory::scopeFilter=where('user_id')`, `ExamResultService=hasPermissionTo('hr-workers')?allowedOrganizations():topics.user_id`, `allowedOrganizations()=QueryHelper::childIds`. NestJS `scope.ids()`≡`childIds` — admin→all Laravel'ning O'ZIDA shunday. Runtime totals MATCH. Kod o'zgarmadi.
    - **`lms/exams`** (LMS: `EduPlanExamController::exams`) — **ASL deviation shu yerda edi.** Laravel: `whereHas('topic', fn=>where('organization_id', $user->organization_id))` — **STRICT bitta org**, childIds YO'Q, admin ham faqat o'zinikini. NestJS `scope.ids()` ishlatardi (admin→all). **FIX:** `topics.organization_id = ctx.user.organization_id` (null→IS NULL). OrgScopeService injection olib tashlandi. Runtime: admin **0/0** (edi 0/2), org-106 user **1/1 ids=[27]** MATCH.

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
