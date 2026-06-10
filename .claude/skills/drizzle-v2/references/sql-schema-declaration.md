# Drizzle SQL Schema Declaration (Secondary Reference)

Sources:
- https://rqbv2.drizzle-orm-fe.pages.dev/docs/sql-schema-declaration
- https://orm.drizzle.team/docs/sql-schema-declaration

Use this together with `relations-v1-v2.md`.

## 1) Source of Truth Principle

Drizzle schema in TypeScript is the source of truth for:
- typed query building in app code
- migration diffing in Drizzle Kit

Rule:
- export all schema models used in migration generation.

## 2) Dialect-Specific Table Builders

Use the correct core package:
- PostgreSQL -> `drizzle-orm/pg-core`
- MySQL -> `drizzle-orm/mysql-core`
- SQLite -> `drizzle-orm/sqlite-core`

Do not mix builders across dialects.

## 3) Recommended Schema Organization

- For small projects: single schema file is acceptable.
- For medium/large projects: split by domain, export from index barrel.
- Keep model names, column names, indexes, constraints explicit and stable.

## 4) What to Define in Schema

Depending on dialect support, define:
- tables and columns
- indexes and constraints
- enums
- schemas (Postgres)
- sequences (Postgres)
- views/materialized views (where applicable)

## 5) Table Declaration Pattern (PostgreSQL)

```ts
import * as p from 'drizzle-orm/pg-core';

export const users = p.pgTable('users', {
  id: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  email: p.varchar().notNull().unique(),
  age: p.integer(),
});
```

Alternative callback style is also valid:

```ts
export const users = p.pgTable('users', (t) => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  email: t.varchar().notNull().unique(),
}));
```

## 6) Constraints and Indexes

Use explicit index/constraint declarations in schema.
For relation-heavy reads, index FK columns on the "many" side and junction tables.

## 7) Foreign Keys vs Relations

- Foreign key = database-level integrity constraint.
- Drizzle relation = app-level mapping for relational query API.
- They are related but independent concepts.
- Prefer both for robust systems.

## 8) Naming/Consistency Rules

- Keep DB identifiers predictable (snake_case in SQL names where your codebase uses it).
- Keep TypeScript property naming consistent with existing project conventions.
- Avoid non-deterministic renames in migration refactors.

## 9) Practical Migration Checklist

1. Confirm every table/export is available to Drizzle Kit.
2. Confirm FK columns and indexes for common joins.
3. Align relation mappings with schema columns (`from`/`to`).
4. Validate query shape in affected modules after schema changes.
