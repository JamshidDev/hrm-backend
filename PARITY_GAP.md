# Laravel'da bor — NestJS'da YO'Q endpointlar (parity gap)

> Avtomatik diff (Laravel `route:list` ↔ NestJS `@Controller` route'lari).

> Soxta-pozitivlar chiqarib tashlangan: dual-verb PATCH (Laravel resource PUT+PATCH ikkalasini yozadi, Nest faqat PUT) va `create`/`edit` forma-stublari.


**Jami haqiqiy yetishmayotgan route: 88**


## /hr (38)

- `DELETE /api/v1/hr/worker-positions/{worker_position}`
- `DELETE /api/v1/hr/workers/{worker}`
- `GET    /api/v1/hr/commands/{command}`
- `GET    /api/v1/hr/confirmation-workers/{confirmation_worker}`
- `GET    /api/v1/hr/contract-additional/{contract_additional}`
- `GET    /api/v1/hr/leaders/{leader}`
- `GET    /api/v1/hr/nationalities/{nationality}`
- `GET    /api/v1/hr/organization-documents/{organization_document}`
- `GET    /api/v1/hr/organization-phones/{organization_phone}`
- `GET    /api/v1/hr/pensioners/{pensioner}`
- `GET    /api/v1/hr/polyclinics/{polyclinic}`
- `GET    /api/v1/hr/vacation-schedules/{vacation_schedule}`
- `GET    /api/v1/hr/worker-academic-degrees/{worker_academic_degree}`
- `GET    /api/v1/hr/worker-academic-titles/{worker_academic_title}`
- `GET    /api/v1/hr/worker-disabilities/{worker_disability}`
- `GET    /api/v1/hr/worker-languages/{worker_language}`
- `GET    /api/v1/hr/worker-militaries/{worker_military}`
- `GET    /api/v1/hr/worker-old-careers/{worker_old_career}`
- `GET    /api/v1/hr/worker-parties/{worker_party}`
- `GET    /api/v1/hr/worker-passports/{worker_passport}`
- `GET    /api/v1/hr/worker-phones/{worker_phone}`
- `GET    /api/v1/hr/worker-photos/{worker_photo}`
- `GET    /api/v1/hr/worker-relatives/{worker_relative}`
- `GET    /api/v1/hr/worker-universities/{worker_university}`
- `GET    /api/v1/hr/workers`
- `GET    /api/v1/hr/workers/{worker}`
- `PATCH  /api/v1/hr/commands/{command}`
- `PATCH  /api/v1/hr/contract-additional/{contract_additional}`
- `PATCH  /api/v1/hr/contracts/{contract}`
- `PATCH  /api/v1/hr/polyclinics/{polyclinic}`
- `PATCH  /api/v1/hr/worker-positions/{worker_position}`
- `POST   /api/v1/hr/Gzoom/check-meet`
- `POST   /api/v1/hr/worker-positions`
- `PUT    /api/v1/hr/commands/{command}`
- `PUT    /api/v1/hr/contract-additional/{contract_additional}`
- `PUT    /api/v1/hr/contracts/{contract}`
- `PUT    /api/v1/hr/polyclinics/{polyclinic}`
- `PUT    /api/v1/hr/worker-positions/{worker_position}`

## /structure (25)

- `DELETE /api/v1/structure/organization-services/{organization_service}`
- `GET    /api/v1/structure/cities/{city}`
- `GET    /api/v1/structure/command-types/{command_type}`
- `GET    /api/v1/structure/contract-additional-types/{contract_additional_type}`
- `GET    /api/v1/structure/contract-types/{contract_type}`
- `GET    /api/v1/structure/countries/{country}`
- `GET    /api/v1/structure/holidays/{holiday}`
- `GET    /api/v1/structure/languages/{language}`
- `GET    /api/v1/structure/learning-centers/{learning_center}`
- `GET    /api/v1/structure/organization-services/{organization_service}`
- `GET    /api/v1/structure/positions/{position}`
- `GET    /api/v1/structure/quotes/{quote}`
- `GET    /api/v1/structure/regions/{region}`
- `GET    /api/v1/structure/reports/{report}`
- `GET    /api/v1/structure/schedules/{schedule}`
- `GET    /api/v1/structure/specialities/{speciality}`
- `GET    /api/v1/structure/universities/{university}`
- `GET    /api/v1/structure/work-days/{work_day}`
- `PATCH  /api/v1/structure/organization-services/{organization_service}`
- `PATCH  /api/v1/structure/reports/{report}`
- `POST   /api/v1/structure/report/create-confirmation`
- `POST   /api/v1/structure/report/store`
- `PUT    /api/v1/structure/organization-services/{organization_service}`
- `PUT    /api/v1/structure/reports-detail/{detailId}`
- `PUT    /api/v1/structure/reports/{report}`

## /admin (7)

- `GET    /api/v1/admin/permissions/{permission}`
- `GET    /api/v1/admin/roles/{role}`
- `GET    /api/v1/admin/users/{user}`
- `PATCH  /api/v1/admin/users/{user}`
- `POST   /api/v1/admin/test`
- `POST   /api/v1/admin/users`
- `PUT    /api/v1/admin/users/{user}`

## /confirmation (5)

- `DELETE /api/v1/confirmation/applications/{application}`
- `GET    /api/v1/confirmation/applications/{application}`
- `PATCH  /api/v1/confirmation/applications/{application}`
- `POST   /api/v1/confirmation/applications`
- `PUT    /api/v1/confirmation/applications/{application}`

## /turnstile (5)

- `GET    /api/v1/turnstile/buildings/{building}`
- `GET    /api/v1/turnstile/schedule/types/{type}`
- `GET    /api/v1/turnstile/terminals/{terminal}`
- `PATCH  /api/v1/turnstile/organization-terminals/{organization_terminal}`
- `PUT    /api/v1/turnstile/organization-terminals/{organization_terminal}`

## /chat (3)

- `GET    /api/v1/chat/categories/{category}`
- `PATCH  /api/v1/chat/media/{medium}`
- `PUT    /api/v1/chat/media/{medium}`

## /signature (2)

- `GET    /api/v1/signature/challenge`
- `POST   /api/v1/signature/auth`

## /vacancies (2)

- `GET    /api/v1/vacancies/careers/{career}`
- `GET    /api/v1/vacancies/educations/{education}`

## /document (1)

- `POST   /api/v1/document/application-confirmation`