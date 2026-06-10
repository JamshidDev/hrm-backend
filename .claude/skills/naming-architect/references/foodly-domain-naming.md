# Foodly Naming — Project-Specific Conventions & Domain Glossary

Apply the book rules **through** these project decisions (from CLAUDE.md). When a
generic rule and a project rule conflict, the project rule wins for wire formats;
the book rules win for internal code clarity.

## Layer-by-Layer Casing (the most common mistake here)

| Layer | Convention | Example |
|---|---|---|
| **DTO fields** (request/response wire) | `snake_case` | `user_id`, `is_active`, `per_page` |
| **Drizzle column keys** (TS schema) | `lowerCamelCase` | `userId`, `isActive`, `createdAt` |
| **DB physical columns** | `snake_case` | `user_id`, `created_at` |
| **Service methods / variables** | `lowerCamelCase` | `findAllOrders`, `runningTotal` |
| **Classes / DTO classes / enums** | `PascalCase` | `OrderStatus`, `CreateOrderDto` |
| **Files** | `kebab-case` | `create-order.dto.ts` |
| **i18n keys** | `snake_case` | `error.invalid_credentials` |

- DTO ↔ Drizzle mapping is explicit in the service (`userId: dto.user_id`). Do
  **not** "fix" a DTO field to camelCase — `whitelist: true` would strip it and
  `@Expose({name})` does not work on request parsing.
- `ResponseInterceptor` converts camelCase → snake_case on the way out, so service
  internals stay camelCase and the API stays snake_case. Don't pre-snake_case
  inside services.

## Service Method Verb Lexicon (pick ONE per action — no synonyms)
The project standard (CLAUDE.md §11). Do not introduce `fetch`/`load`/`retrieve`
as alternates to these.

| Action | Top-level | Sub-resource |
|---|---|---|
| list | `findAll(query)` | `findAllTransportTypes(query)` |
| detail | `findOne(id)` | `findOneProduct(id)` |
| create | `create(dto, file?)` | `createTransportType(dto)` |
| update | `update(id, dto, file?)` | `updateTransportType(id, dto)` |
| delete | `delete(id)` | `deleteTransportType(id)` |
| toggle | `toggleActive(id)` | |
| get sub-value | `getBalance(merchantId)`, `getConfig(regionId)` | |
| upsert | `upsertCommission(merchantId, dto)` | |
| link / unlink | `assignOwner(...)` / `removeOwner(...)` | |
| cancel | `cancelOrder(id, dto)` | |
| set current | `setCurrentTariff(id)` | |

Private helpers follow set patterns: `ensureExists`, `ensureUniqueSlug`,
`selectColumns`, `attachRelations`.

## DTO Class Naming
`Create<Entity>Dto`, `Update<Entity>Dto`, `<Entity>QueryDto`,
`<Entity>ResponseDto`, `<Entity>MiniResponseDto` / `<Entity>LookupDto`. Update DTOs
strip immutable fields: `PartialType(OmitType(CreateXDto, ['product_id'] as const))`.

## Boolean & Predicate Names (wire + code)
`is_active` / `isActive`, `has_next_page` / `hasNextPage`, `should_notify`,
`can_edit`, `was_delivered`. Positive form only — no `is_not_active`.

## Domain Glossary — use the business word, every layer
Use these exact terms; do not invent synonyms (no `customer` where the domain
says `user`, no `store` where it says `merchant`).

| Domain term | Means | NOT |
|---|---|---|
| `user` | end customer (client app), `users` table | customer, client (in code) |
| `merchant` | restaurant/partner | store, shop, vendor, restaurant |
| `merchant_branch` / `branch` | physical outlet of a merchant | location, outlet, point |
| `courier` | delivery rider | driver, deliverer |
| `order` | a customer order | purchase, cart, deal |
| `order_item` | line item in an order | product (it references a product) |
| `product` | catalog item | item, good, dish |
| `branch_product` | product offered at a branch (price/status) | inventory |
| `region` | geographic service area | zone, city, area |
| `tariff` | courier pricing rule set | rate, pricing |
| `commission` | merchant fee config | fee, charge |
| `promo_code` | discount code | coupon, voucher |
| `cancel_reason` | reason catalog for cancellation | reason, cause |
| `review` / `review_option` | rating + star-bound option | feedback, comment |
| `billing` / `transaction` | money movement records | payment (reserve for `PaymentType`) |
| `courier_bag` | courier cash-holding / settlement | wallet (that's different) |

## ID & Coordinate Naming (project-specific gotchas)
- `users.id` = **bigint**, taxi global sync key only. `users.uuid` = the UUID all
  internal FKs/polymorphic point to. Never name a UUID FK `user_id` expecting the
  bigint, and never expose `users.id` raw (BigInt JSON crash → `id.toString()`).
- `couriers.id` is **UUID** (polymorphic consistency) — never rename/retype to int.
- **Coordinates in API/socket payloads:** always `lat` / `lng` — never `long`/`lon`
  on the wire (project rule). Internal PostGIS GeoJSON uses `[lon, lat]` order; name
  the parsed locals `lat`/`lon` but the payload keys stay `lat`/`lng`.

## Order Number
No `orders.order_number` column. The display value is built from
`prefix` + `year` + `number` via `formatOrderNumber(...)` → `EVOS-2025-0001`.
Name it `order_number` only as the **derived response field**, never a stored column.

## Enums — import, don't stringify
Status/type values come from `@foodly/db` enums (`OrderStatus`, `RoleSource`,
`ImageOwner`, `PaymentType`, ...). Never name a raw string `'PENDING'`; reference
`OrderStatus.CREATED`. Enum members are UPPER_SNAKE in the DB, referenced via the
PascalCase enum object in code.
