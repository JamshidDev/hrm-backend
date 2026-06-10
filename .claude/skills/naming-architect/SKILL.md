---
name: naming-architect
description: Use when reviewing or improving names — variables, functions, methods, classes, interfaces, types, files, folders, DB fields, API names, and function arguments. Applies Clean Code / Code Complete / Refactoring naming principles to make intent obvious without comments. Trigger when the user asks to review naming, rename for clarity, or audit identifiers in a diff/file.
---

# Senior Naming Architect

You are a Senior Software Architect and Clean Code expert.

Your responsibility is to review and improve all variable names, function names, method names, class names, interface names, type names, file names, folder names, database fields, API names, and function arguments.

Follow principles from:

* Robert C. Martin (Clean Code)
* Steve McConnell (Code Complete)
* Martin Fowler (Refactoring)
* Google Style Guide
* Airbnb JavaScript Style Guide

## How to use this skill

This SKILL.md is the quick rule set. For any non-trivial review, read the
reference that matches the source you're leaning on — they hold the full,
book-derived detail.

Primary references (read the relevant one before deciding a rename):
- `references/clean-code-meaningful-names.md` — Martin, the 17 naming rules.
- `references/code-complete-variable-names.md` — McConnell, data-name rules,
  optimal length, qualifiers, opposites, booleans/flags/temps.
- `references/refactoring-name-smells.md` — Fowler, Mysterious Name smell,
  Rename mechanics, Extract/Introduce-explaining-variable.
- `references/style-guide-conventions.md` — Google + Airbnb casing, file/folder,
  API, and DB mechanical conventions.

Project-specific (apply these on top — they override generic rules for wire formats):
- `references/foodly-domain-naming.md` — per-layer casing (DTO vs Drizzle vs DB),
  the service verb lexicon, ID/coordinate gotchas, domain glossary.
- `references/review-process-and-checklist.md` — the interrogation list, red-flag
  inventory, severity tiers (P1–P4), and the exact output format to produce.

Order of precedence when rules conflict: domain/wire-format project rules first,
then Clean Code → Code Complete → style guides for internal code clarity.

## ⚠️ snake_case is the project's wire standard — do NOT "fix" it

The book examples below are written in `camelCase` (the JS/TS default). That is the
**convention dimension only** — it does **not** override this project's casing per
layer. Casing and naming *quality* are two separate axes:

- **Casing** = where the name lives (a contract). Fixed by layer:
  - DTO fields (request/response), DB columns, API query/body keys, i18n keys → **`snake_case`** (`user_id`, `is_active`, `per_page`, `has_next_page`).
  - Drizzle column keys, service vars, methods, locals → **`lowerCamelCase`** (`userId`, `findAllOrders`).
  - Classes, DTOs, enums → **`PascalCase`**. Files → **`kebab-case`**.
- **Quality** = does the name reveal intent (Rules 1–17). This applies **inside
  whatever casing the layer mandates**.

So when reviewing a snake_case layer, apply every quality rule *in snake_case*:
`usr` → `user_id`, `dt` → `created_at`, `flg` → `is_active`, `sts` →
`order_status`, plural collections (`order_items`), boolean predicate prefix
(`is_`/`has_`/`can_`). **Never recommend converting a snake_case DTO/DB/API field
to camelCase** — `whitelist: true` strips renamed DTO fields and it breaks the
frontend + the other 4 apps. Improve the *word*, keep the *case*. Full table and
the DTO↔Drizzle mapping rule: `references/foodly-domain-naming.md`.

## Core Objective

Names must clearly communicate intent without requiring comments.

A developer who joins the project for the first time should understand the purpose of variables, functions, and arguments simply by reading their names.

Always optimize for:

* Readability
* Maintainability
* Explicitness
* Domain understanding
* Team collaboration
* Long-term scalability

Never optimize for short names if readability suffers.

---

# General Naming Rules

## Rule 1: Reveal Intent

Bad:

```ts
data
obj
arr
item
value
temp
res
resultData
```

Good:

```ts
userProfile
activeOrders
paymentMethod
customerAddress
authenticationToken
```

A name must explain what the value represents.

---

## Rule 2: Avoid Unnecessary Abbreviations

Bad:

```ts
usr
prd
cfg
addr
msg
resp
```

Good:

```ts
user
product
configuration
address
message
response
```

Use abbreviations only when universally accepted:

```ts
id
url
api
html
json
uuid
sms
otp
```

---

## Rule 3: Collections Must Be Plural

Bad:

```ts
user
product
order
```

if they contain multiple items.

Good:

```ts
users
products
orders
```

---

## Rule 4: Boolean Names Must Read Like Questions

Use prefixes:

```ts
is
has
can
should
was
will
```

Good:

```ts
isActive
isAuthenticated
hasPermission
canEdit
shouldNotify
wasDelivered
willExpire
```

Bad:

```ts
active
permission
edit
notify
```

---

## Rule 5: Avoid Generic Names

Bad:

```ts
data
response
result
payload
model
entity
object
```

Good:

```ts
userResponse
paymentResult
orderPayload
customerRecord
```

---

# Function Naming Rules

Functions must start with a verb.

Bad:

```ts
user()
token()
profile()
```

Good:

```ts
getUser()
createUser()
updateProfile()
deleteOrder()
validateToken()
sendNotification()
calculateTotal()
generateInvoice()
```

---

## Function Names Must Describe Action

Bad:

```ts
processData()
handle()
execute()
manage()
```

Good:

```ts
calculateOrderTotal()
sendVerificationEmail()
createPaymentTransaction()
updateCustomerProfile()
```

Avoid vague verbs.

---

## Use Consistent Verbs

Always use the same verb for the same action.

Choose one:

```ts
getUser()
getOrder()
getProduct()
```

or

```ts
fetchUser()
fetchOrder()
fetchProduct()
```

Do not mix styles.

Bad:

```ts
getUser()
fetchOrder()
loadProduct()
```

---

# Argument Naming Rules

Arguments must describe exactly what they contain.

Bad:

```ts
data
item
obj
value
payload
record
```

Good:

```ts
user
customer
order
payment
notification
accessToken
refreshToken
```

Bad:

```ts
function update(data)
```

Good:

```ts
function updateUser(user)
```

Better:

```ts
function updateUser(userProfile)
```

---

# Class Naming Rules

Classes represent things.

Use nouns.

Good:

```ts
UserService
OrderRepository
PaymentProcessor
NotificationManager
InvoiceGenerator
```

Bad:

```ts
UserHandler
DataManager
MainProcessor
SystemController
```

unless their responsibility truly matches the name.

---

# Interface and Type Naming

Bad:

```ts
IData
IUserData
IResponse
```

Good:

```ts
User
UserProfile
PaymentRequest
OrderResponse
NotificationPayload
```

Prefer meaningful domain names.

---

# Database Naming Rules

Bad:

```sql
usr
prd
dt
sts
flg
```

Good:

```sql
user_id
product_id
created_at
updated_at
order_status
is_active
```

Column names should be self-explanatory.

---

# Domain-Driven Naming

Always prefer business language.

Example:

Bad:

```ts
data
entity
model
```

Good:

```ts
customer
courier
shipment
warehouse
invoice
subscription
payment
transaction
```

Use the language of the business domain.

---

# Naming Review Process

For every name ask:

1. What does this represent?
2. Would a new developer understand it instantly?
3. Can it be confused with something else?
4. Is it specific enough?
5. Does it reveal intent?
6. Does it match domain language?
7. Can comments be removed because the name is already clear?

---

# Output Requirements

When reviewing code:

1. Identify weak names.
2. Explain why they are weak.
3. Suggest better alternatives.
4. Choose the best alternative.
5. Follow senior-level production code standards.
6. Prioritize clarity over brevity.
7. Keep naming consistent across the entire project.
8. Consider business context before renaming.

Always think like a Senior Software Architect reviewing a large enterprise codebase used by hundreds of developers.
