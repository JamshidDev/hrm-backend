# Style-Guide Conventions — Google & Airbnb (casing, files, identifiers)

The books give principles; the style guides give the **mechanical conventions**
that make a codebase uniform. This project is TypeScript/Node, so the JS/TS rules
apply.

## Casing Rules (Google TS Style Guide + Airbnb)

| Element | Case | Example |
|---|---|---|
| Variable, parameter, function, method | `lowerCamelCase` | `activeOrders`, `getUser()` |
| Class, interface, type alias, enum, decorator | `UpperCamelCase` (PascalCase) | `UserService`, `OrderStatus` |
| Enum **members** | `UpperCamelCase` (Google) | `OrderStatus.Pending` |
| Module-level / exported constant (truly immutable) | `CONSTANT_CASE` | `MAX_PER_PAGE` |
| Local const that is just a value | `lowerCamelCase` | `const perPage = 10` |
| Type parameter (generic) | single `T` or `UpperCamelCase` | `T`, `RequestType` |
| Private member | `lowerCamelCase` (no `_` prefix in Google) | `this.cache` |

- **Google:** do **not** use `_` prefix/suffix for private fields; use the
  language `private` keyword. Don't use `CONSTANT_CASE` just because something is
  `const` — reserve it for deeply-immutable, exported, module-scope values.
- **Airbnb:** `UPPERCASE` only for exported constants. Never name a default export
  differently from its file.

## Identifier Rules
- **No `I` prefix on interfaces**, no `T` prefix on types (Google). `User`, not
  `IUser`.
- **No type info in names** (no Hungarian): `optsArray` → `opts`, `nameString`
  → `name`.
- **Abbreviations:** treat acronyms as words — `loadHttpUrl`, `XmlHttpRequest`,
  `userId` (not `userID`). Be consistent. Universally-OK shorthand: `id`, `url`,
  `api`, `db`, `http`, `json`, `uuid`, `sms`, `otp`, `i`/`j` (loop), `ok`.
- **Boolean** identifiers read as predicates: `is/has/can/should/did/will` prefix.
- **Don't abbreviate** to save keystrokes (`mgr`, `cfg`, `cnt`). Autocomplete is
  free; clarity is not.

## File & Folder Naming
- **File names:** `kebab-case` (Angular/Google convention used in this repo) —
  `user-profile.service.ts`, `create-order.dto.ts`. One primary export per file,
  and the file name matches it (`UserProfileService` → `user-profile.service.ts`).
- **Test files:** mirror the unit — `order.service.spec.ts` / `order.service.test.ts`.
- **Folders:** `kebab-case`, **plural for collections of like things**
  (`modules/`, `decorators/`, `guards/`), singular for a single concept folder.
- Avoid `utils`, `helpers`, `common`, `misc` as dumping grounds — name folders for
  the **domain** they hold (`pricing/`, `notifications/`).

## API & Endpoint Naming (REST)
- **Resources are plural nouns**, not verbs: `GET /orders`, `POST /orders`,
  `GET /orders/{id}`. Never `GET /getOrders`.
- Sub-resources nest by ownership: `GET /merchants/{id}/branches`.
- Actions that aren't CRUD become a verb sub-path sparingly:
  `POST /orders/{id}/cancel`.
- **Query params & JSON body:** `snake_case` in this project (see CLAUDE.md);
  pick one wire convention and never mix `camelCase`/`snake_case` in the same API.
- Booleans in payloads keep the predicate prefix: `is_active`, `has_next_page`.

## Database Naming
- **Tables:** `snake_case`, **plural** — `users`, `order_items`, `promo_codes`.
- **Columns:** `snake_case`, self-explanatory — `user_id`, `created_at`,
  `order_status`, `is_active`. No `usr`, `dt`, `flg`.
- **Foreign keys:** `<singular_referenced_table>_id` — `merchant_id`, `courier_id`.
- **Timestamps:** `created_at`, `updated_at`, `deleted_at`, `<event>_at`
  (`delivered_at`, `cancelled_at`).
- **Booleans:** `is_`/`has_` prefix — `is_active`, `has_paid`.
- **Enums:** singular concept name for the type; UPPER_SNAKE values
  (`PENDING`, `IN_PROGRESS`).
- **Indexes/constraints:** predictable pattern — `idx_orders_merchant_id`,
  `uq_merchants_prefix`, `fk_orders_courier_id`.

## Consistency Beats Personal Preference
Both guides end with the same rule: **when in doubt, match the surrounding code.**
A locally-consistent "wrong" convention is more maintainable than a locally-
inconsistent "right" one. Propose a global rename pass instead of one-off
deviations.
