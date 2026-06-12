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
- **Bosqich:** 1-BOSQICH (AUDIT) tugadi → foydalanuvchi tasdig'i kutilmoqda.
- **Oxirgi tugatilgan:** `GET /user/mobile/work-info` (9/9 MATCH, commit qilindi).
- **Keyingi qadam:** Foydalanuvchi tasdiqlagach → 0-BOSQICH (28 role uchun test-user + scripts/tokens.sh + scripts/api-diff.sh), so'ng 2-BOSQICH (78 endpoint bittalab).

## Role'lar (DB `roles` jadvali — 28 ta, guard=sanctum)
HR, Worker, Admin, Finance, Economist, Jurist, HrLeader, EconomistLeader, OrganizationLeader, Hospital, TurnstileLeader, LmsLearningCenter, LmsTeacher, TurnstileViewer, SuperLms, TestLeader, TurnstileManagement, EMM, TimesheetHR, NBT, ToshkentMtuIntegration, HrViewLeader, EconomistManagement, IKT, WorkersView, LeaderManagement, (bo'sh #29), Test role #30

RolesEnum (`Modules/Structure/.../RolesEnum.php`): Worker, HR, Finance, Jurist, Economist, HrLeader, EconomistLeader, Hospital, TurnstileViewer, TurnstileLeader, ...

## Test userlar (0-BOSQICH — yaratiladi)
| Role | Email | Token | Bog'liq data | Holat |
|------|-------|-------|--------------|-------|
| (har role uchun {role}@test.uz — keyingi bosqichda) | | | | ⏳ TODO |

> Hozircha parity test mavjud real userlar bilan qilingan: 99, 161, 8454, 34764 (mobile), 1231294 (admin).

## Scriptlar (0-BOSQICH — yaratiladi)
- `scripts/tokens.sh` — har role token (⏳ TODO)
- `scripts/api-diff.sh` — METHOD PATH TOKEN BODY → ikki serverga so'rov, `jq -S` diff + header diff (⏳ TODO)
- Mavjud yordamchi: `/tmp/pdfcheck/cmp.sh` (GET parity), python deep-diff (S3 URL normalizatsiya).

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

## Topilgan buglar va tuzatishlar (bu sessiya)
- `user/mobile/work-info`: region/city/nationality SoftDeletes relation → o'chirilgan bo'lsa Laravel `null` qaytaradi (NestJS `notDeleted` qo'shildi)
- `user/mobile/work-info`: `languages` belongsToMany pivot soft-delete'ni filtrlamaydi (NestJS'dan `notDeleted` olib tashlandi)
- `user/mobile/work-info`: `positions.position:id,name` eager-load → `name_ru`/`name_en` yuklanmaydi → ru/en'da `null` (PositionMinimalResource fallback'siz)
- `user/mobile/my-vacations`: VacationTypeEnum command-type→ta'til-turi map
- `user/mobile/personal-list` + `work-info`: i18n `messages.mobile.*`, `worker.marital_status`, `worker.family` qo'shildi (3 til)

## ⛔ Laravel'da error bergan route'lar
| # | Method | Path | Status | Sabab |
|---|--------|------|--------|-------|
| 1 | GET | structure/positions/{id} | 500 | (spot-check; keyin tekshiriladi) |

## E'tibor talab qiladigan joylar
1. **B-kategoriya (43 GET-show)**: Laravel `apiResource` avtomatik `show()` — haqiqatda ishlatiladimi? Hammasini implement qilish ko'p, lekin frontend ishlatmasa keraksiz. → Prioritet bo'yicha qaror kerak.
2. **28 role uchun test-user**: shared DB'ga 28 user + bog'liq data (organization/department) yoziladi — tasdiq kerak.
3. **EXTRA 10**: NestJS qo'shgan route'lar Laravel'da yo'q — qoldiriladimi yoki olib tashlanadimi?
