# Drizzle Relational Queries v1 -> v2 (Primary Reference)

Priority:
1. https://rqbv2.drizzle-orm-fe.pages.dev/docs/relations-v1-v2
2. https://orm.drizzle.team/docs/relations-v1-v2
3. https://orm.drizzle.team/docs/relations-v2

This file is the primary ruleset for relation/query migration and all new relation work.

## 1) Core Migration Direction

- New relation config is centralized with `defineRelations(schema, (r) => ({ ... }))`.
- Old per-table `relations(table, ...)` objects are v1 style and should not be introduced in new code.
- Prefer `db.query.*` over `db._query.*`.

## 2) API Renames You Must Enforce

- `fields` -> `from`
- `references` -> `to`
- `relationName` -> `alias`

Both `from` and `to` accept either:
- a single column reference, or
- an array for composite relations.

## 3) v2 Relation Authoring Patterns

### 3.1 one-to-one / many-to-one

```ts
posts: {
  author: r.one.users({
    from: r.posts.authorId,
    to: r.users.id,
  }),
}
```

### 3.2 one-to-many

```ts
users: {
  posts: r.many.posts({
    from: r.users.id,
    to: r.posts.authorId,
  }),
}
```

### 3.3 many-to-many through junction table

```ts
users: {
  groups: r.many.groups({
    from: r.users.id.through(r.usersToGroups.userId),
    to: r.groups.id.through(r.usersToGroups.groupId),
  }),
}
```

## 4) Important v2 Behaviors

- You can define only the `many` side when needed (v1 required extra inverse setup).
- `optional: false` can force relation key requiredness at type level.
- `where` in relation definitions can constrain polymorphic/filtered relations.
- MySQL mode-specific relation handling from old `drizzle(..., { mode })` style is removed for v2 relation flow.

## 5) Query Migration Rules

### 5.1 where: callback -> object

v1:
```ts
where: (users, { eq }) => eq(users.id, 1)
```

v2:
```ts
where: { id: 1 }
```

### 5.2 orderBy: callback array -> object

v1:
```ts
orderBy: (users, { asc }) => [asc(users.id)]
```

v2:
```ts
orderBy: { id: 'asc' }
```

### 5.3 Complex filters

Use object composition with `AND`, `OR`, `NOT`, and `RAW` when needed.

```ts
where: {
  AND: [
    { age: { gte: 18 } },
    {
      OR: [
        { name: { ilike: 'john%' } },
        { RAW: (table) => sql`LOWER(${table.name}) LIKE 'jane%'` },
      ],
    },
  ],
}
```

## 6) Split Relations Safely

If relation config is large:
- use `defineRelationsPart(...)`
- merge parts when passing to drizzle
- keep deterministic merge order (`main` then `parts`)

## 7) Partial Upgrade Strategy

Allowed temporary bridge:
- old relations imports from legacy paths for untouched areas
- old query style kept in untouched modules

But for changed/new code:
- always use v2 relation + query style.

## 8) Team Guardrails

1. Never add new `fields`/`references` keys.
2. Never add new `relationName` key.
3. Prefer explicit `from`/`to` for clarity.
4. Use `through(...)` for direct many-to-many reads.
5. Keep migrations behavior-safe: syntax change first, logic change only when requested.
