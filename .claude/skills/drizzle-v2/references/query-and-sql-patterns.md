# Drizzle Query and SQL Patterns (Secondary Reference)

Sources:
- https://orm.drizzle.team/docs/rqb-v2
- https://orm.drizzle.team/docs/select
- https://orm.drizzle.team/docs/operators

Goal:
- keep relational queries readable, typed, and performant
- only use raw SQL where object API is insufficient

## 1) Preferred Query Shape (RQB v2)

```ts
const rows = await db.query.users.findMany({
  where: {
    active: true,
    age: { gte: 18 },
  },
  orderBy: { createdAt: 'desc' },
  limit: 20,
  offset: 0,
  with: {
    posts: {
      where: { published: true },
      orderBy: { id: 'desc' },
      limit: 5,
    },
  },
});
```

## 2) Filter Operators to Prefer

Common operators from official docs:
- `eq`, `ne`
- `gt`, `gte`, `lt`, `lte`
- `inArray`, `notInArray`
- `isNull`, `isNotNull`
- `like`, `ilike`
- `exists`, `notExists`
- `and`, `or`, `not`

## 3) Complex Conditions

Use structured filter objects first.
Use `RAW` only when expression is not representable cleanly.

```ts
where: {
  AND: [
    { status: 'active' },
    {
      OR: [
        { name: { ilike: 'a%' } },
        { RAW: (table) => sql`LOWER(${table.email}) LIKE 'admin%'` },
      ],
    },
  ],
}
```

## 4) Partial Field Selection

When only a subset is needed, request only required columns/relations.
This reduces payload and clarifies intent.

```ts
const users = await db.query.users.findMany({
  columns: { id: true, email: true, createdAt: true },
  with: {
    posts: {
      columns: { id: true, title: true },
      limit: 3,
    },
  },
});
```

## 5) SQL-First vs Query-Builder Guidance

Use Drizzle builder by default.
Use raw `sql``...`` when:
- vendor-specific features are needed
- JSON/path/cast expressions are too complex
- performance-critical hand-tuned query is required

Even with raw SQL:
- keep parameterized expressions
- avoid string interpolation for user input
- keep SQL readable and reviewed

## 6) Query to SQL Mental Model

For relation queries, think in SQL terms:
- `where` -> `WHERE`
- `orderBy` -> `ORDER BY`
- `limit/offset` -> `LIMIT/OFFSET`
- nested `with` -> additional relation fetch paths (driver/query strategy dependent)

This helps verify correctness during refactors.

## 7) Project Usage Recommendation

Given this repository already uses `defineRelations` and `db.query` style:
- continue v2-first in all new code
- migrate old patterns opportunistically during touched-file work
- prefer minimal behavior change refactors
