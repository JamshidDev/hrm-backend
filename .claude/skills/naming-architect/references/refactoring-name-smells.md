# Refactoring — Naming Smells & Rename Mechanics (Martin Fowler, 2nd ed.)

Fowler treats naming as a first-class refactoring. A name is a hypothesis about
what the code does; when the hypothesis is wrong, rename.

## The Smell: Mysterious Name
The #1 code smell in Fowler's catalog. If you can't think of a good name, that
often signals a deeper design problem — the thing does too much or is the wrong
abstraction. *"If you can't think of a name that clarifies the function, it's
often a sign of a deeper malaise."*

Litmus test: explain the element to a teammate in one sentence. The nouns and
verbs you naturally use **are** the name.

## The Rename Refactorings
- **Rename Variable** — local/field clarity.
- **Rename Field** — record/struct/DB-ish field; ripple through readers.
- **Change Function Declaration** (a.k.a. Rename Function / Rename Method) — the
  function name *and* its parameter names are part of its interface.
- **Rename** parameters too: a parameter name documents intent at every call site
  more than the argument value does.

### Mechanics (safe rename)
1. If the name is used widely, consider a transition: add the new name, deprecate
   the old, migrate callers, then remove the old.
2. For a simple change, use the IDE's rename — but **verify** it didn't catch
   string literals, comments, or unrelated same-named symbols.
3. Rename in small, separately-tested steps; never bundle a rename with a logic
   change in the same commit (review noise hides bugs).
4. Test after each step.

## Good-Name Heuristics from Refactoring
- **The name should survive a "why" question.** If `check()` always invites "check
  what?", the name is incomplete → `checkInventoryAvailability()`.
- **Reveal the result, not the mechanism.** `getCreditScore()` not `runSqlAndParse()`.
- **Names age with the code.** When behavior changes, the name is the first thing
  to drift. Treat a stale name as a defect.
- **Comments are often deodorant for bad names.** Before writing an explanatory
  comment, try to fold the explanation into the name (Extract Variable /
  Extract Function with an intention-revealing name).

### Introduce Explaining Variable / Extract Variable
Replace a complex expression (or part of one) with a well-named variable. The
name carries the meaning the expression hides.

```ts
// Before
if (platform.toUpperCase().indexOf('MAC') > -1 &&
    browser.toUpperCase().indexOf('IE') > -1 &&
    wasInitialized() && resize > 0) { ... }

// After
const isMacOs       = platform.toUpperCase().includes('MAC');
const isIeBrowser   = browser.toUpperCase().includes('IE');
const wasResized    = resize > 0;
if (isMacOs && isIeBrowser && wasInitialized() && wasResized) { ... }
```

### Extract Function names the *why*
When you extract, name by **intent (what & why)**, not by **how**. If you'd name
it after its body, the extraction isn't earning its keep.

## Consistency Across the Codebase
Fowler stresses a **shared vocabulary**: the same domain concept must have the same
word everywhere (echoes Martin's "one word per concept"). Renames that improve a
single file but break codebase consistency are a net loss — align with the
existing lexicon, or rename the lexicon everywhere in a dedicated pass.
