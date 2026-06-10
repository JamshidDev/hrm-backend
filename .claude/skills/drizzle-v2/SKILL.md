---
name: drizzle-v2
description: Use when adding or refactoring Drizzle ORM schema, relations, and relational queries. Prioritize Relational Queries v1->v2 migration rules, then apply SQL schema declaration and query/filter docs in consistent v2-first style.
---

# Drizzle Relations v2

Use this skill when working with:
- `defineRelations(...)` in schema relation files
- `db.query.*` relational queries
- Migration from old `relations(...)`/`db._query` style to v2 style

Primary reference (must-read first):
- `references/relations-v1-v2.md`

Secondary references:
- `references/sql-schema-declaration.md`
- `references/query-and-sql-patterns.md`

Project relation file:
- `libs/db/src/lib/db.relations.ts`

## Rules

1. Define schema with dialect-specific builders:
   - PostgreSQL: `drizzle-orm/pg-core`
   - MySQL: `drizzle-orm/mysql-core`
   - SQLite: `drizzle-orm/sqlite-core`
   - Export all schema models used by Drizzle Kit migration diff.

2. Define relations in v2 style:
   - Use `defineRelations(schema, (r) => ({ ... }))`.
   - Keep relation keys grouped by table.
   - For split relation configs, use `defineRelationsPart(...)` and merge in stable order.

3. Use `from` / `to`, not `fields` / `references`:
   - Single key: `from: r.posts.authorId`, `to: r.users.id`
   - Composite keys: arrays in `from` and `to`

4. Use `alias` instead of `relationName`.

5. For many-to-many, prefer `through(...)`:
   - `from: r.users.id.through(r.usersToGroups.userId)`
   - `to: r.groups.id.through(r.usersToGroups.groupId)`

6. Query style must be v2-first:
   - Prefer `db.query.table.findMany/findFirst`
   - `where` must be object-based (`AND`, `OR`, `NOT`, `RAW` supported)
   - `orderBy` must be object-based (`{ id: 'asc' }`)
   - Use nested `with`, nested filters, nested `limit/offset`, and partial columns intentionally.

7. If only `many` side is needed, define it directly with explicit `from`/`to` when needed.

8. Keep migration compatibility only when required:
   - Old `db._query` usage is temporary only.
   - New code should not introduce v1-only patterns.

9. Use Drizzle operators/functions from official docs for filters:
   - `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
   - `and`, `or`, `not`
   - `inArray`, `notInArray`, `isNull`, `isNotNull`
   - `like`, `ilike`, `exists`, `notExists`

10. SQL style guidance for raw `sql`` usage:
   - Keep expressions minimal and typed when possible.
   - Prefer object filters before falling back to `RAW`.
   - When migrating from callback filters, preserve logic exactly.

## Migration Checklist (v1 -> v2)

1. Replace `relations(...)` blocks with one `defineRelations(...)` map.
2. Convert `fields` -> `from`, `references` -> `to`.
3. Convert `relationName` -> `alias`.
4. Convert callback `where` to object `where`.
5. Convert callback `orderBy` to object `orderBy`.
6. Prefer direct many-to-many relation access via `through(...)`.
7. Ensure `drizzle(...)` uses `{ relations }` (not legacy mode-based relation behavior).
8. Replace old filter callbacks with object `where`.
9. Replace callback `orderBy` arrays with object `orderBy`.

## Output Expectations

- Produce readable, consistent v2 relations with explicit intent.
- Do not mix old and new relation styles in the same new feature unless required for partial migration.
- Preserve behavior when refactoring; only syntax/style should change unless user asks for logic changes.
- If unsure, align with `relations-v1-v2` first, then `sql-schema-declaration`, then `rqb-v2` query docs.
