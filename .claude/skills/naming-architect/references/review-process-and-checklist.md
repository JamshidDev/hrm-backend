# Naming Review — Process, Checklist & Output Format

How to actually run a naming review and what to hand back.

## Per-Name Interrogation (run on every identifier)
1. **What does this represent?** (one sentence; if you can't, it's a Mysterious Name)
2. Would a first-day developer understand it instantly?
3. Can it be confused with something nearby? (similar spelling/meaning)
4. Is it specific enough? (`data`/`info`/`item` almost never are)
5. Does it reveal intent without a comment?
6. Does it match the **domain glossary** (foodly-domain-naming.md)?
7. Could a comment be deleted because the name now says it?
8. Is the casing right **for its layer** (DTO vs Drizzle vs DB vs class)?
9. Is the verb consistent with the project lexicon? (no `fetch` where `findAll` is standard)
10. Boolean? Does it read as a positive predicate (`is/has/can`)?

## Red-Flag Name Inventory (grep for these)
Variables/args: `data`, `obj`, `arr`, `item`, `value`, `temp`, `tmp`, `res`,
`result`, `payload`, `record`, `info`, `e`/`err` (outside catch), `x`, `foo`,
`flag`, `arr1`, `list2`.
Functions: `handle`, `process`, `execute`, `manage`, `doStuff`, `run`, `check`
(without an object), `update`/`get` with no noun.
Classes: `*Manager`, `*Handler`, `*Processor`, `*Helper`, `*Util(s)`, `*Data`,
`*Info` — challenge each (keep only if responsibility truly matches).
Interfaces/types: `I`-prefixed, `*Data`, `*Model`, `*Object`.
DB: `usr`, `prd`, `dt`, `sts`, `flg`, `num`, single-letter columns.

## Severity Tiers (so the user can triage)
- **P1 — Misleading / wrong:** name says X, code does Y. Disinformation, wrong
  domain word, boolean that lies. Fix first.
- **P2 — Vague / generic:** `data`, `handle`, `temp`. Real readability cost.
- **P3 — Convention / consistency:** casing for layer, verb-lexicon drift,
  pluralization, abbreviation. Mechanical but matters at scale.
- **P4 — Polish:** length tuning, qualifier ordering, nicer domain phrasing.

## Output Format (use this structure in the review)
For each finding:

```
[P2] apps/client/.../orders.service.ts:42
  Current : const data = await this.db.select()...
  Why     : "data" reveals nothing; it's the active orders for a user.
  Options : activeOrders | userOrders | pendingOrders
  Best    : activeOrders   (matches domain glossary; plural collection)
```

Rules for the output:
1. Identify the weak name and **where** (`file:line`).
2. State **why** it's weak (cite the rule: intent / generic / abbreviation /
   consistency / domain).
3. Give 2–3 alternatives.
4. **Pick the best** and say why (one line).
5. Group by severity (P1→P4); lead with P1.
6. If a rename ripples (DTO field, DB column, API key), **flag the blast radius**
   and the CLAUDE.md "ask before changing" rule — DTO/DB/API/response renames need
   the developer's sign-off because frontend & other apps depend on them.

## Renaming Safely (when applying, not just suggesting)
- One rename per commit; never mix with logic changes (Fowler).
- Wire-format names (DTO fields, DB columns, API paths, response keys) are a
  **contract** — per CLAUDE.md, confirm with the developer before changing; they
  break frontend and the other 4 apps.
- Internal locals/privates/helpers: rename freely, then run the build/tests.
- After rename, grep for the old name in **strings, comments, i18n keys, and tests**
  — IDE rename misses those.

## What NOT to Do
- Don't rename for symmetry alone ("the other app calls it X").
- Don't shorten a clear name to save characters.
- Don't bulk-rename across a wire contract without approval.
- Don't introduce a synonym for an action that already has a project verb.
- Don't add gratuitous context prefixes (`GSDAccountAddress`).
