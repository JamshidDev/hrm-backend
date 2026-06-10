# Clean Code — Meaningful Names (Robert C. Martin, Ch. 2)

The 17 naming rules from *Clean Code*. Apply them in order; each later rule
assumes the earlier ones are already satisfied.

## 1. Use Intention-Revealing Names
The name should answer **why it exists, what it does, and how it is used**. If a
name needs a comment, it does not reveal intent.

```ts
// Bad
let d; // elapsed time in days

// Good
let elapsedTimeInDays;
let daysSinceCreation;
let daysSinceModification;
```

Reveal context. `int[] theList` tells nothing; `int[] flaggedCells` tells
everything.

## 2. Avoid Disinformation
- Do not use a name that means something else (`accountList` when it is not a
  `List` — use `accounts` or `accountGroup`).
- Avoid names that vary in small ways (`XYZControllerForEfficientHandlingOfStrings`
  vs `XYZControllerForEfficientStorageOfStrings`).
- Beware lower-case `l` and upper-case `O` — they read as `1` and `0`.

## 3. Make Meaningful Distinctions
Do not write number-series names (`a1`, `a2`, `a3`) or **noise words**. `Product`,
`ProductInfo`, `ProductData` are indistinguishable — `Info` and `Data` add nothing.

Noise words to avoid: `Info`, `Data`, `Object`, `the`, `a`, `an`, `variable`,
`table`, `String` (in a string name). `getActiveAccount()`,
`getActiveAccounts()`, `getActiveAccountInfo()` cannot be told apart.

## 4. Use Pronounceable Names
`genymdhms` (generation date, year, month, day, hour, minute, second) → `generationTimestamp`.
You cannot discuss what you cannot pronounce.

## 5. Use Searchable Names
Single letters and raw numeric constants are hard to grep. `MAX_CLASSES_PER_STUDENT`
is searchable; `7` is not. Single-letter names are acceptable **only** as local
loop counters in tiny scopes.

## 6. Avoid Encodings
- **No Hungarian notation** (`strName`, `iCount`) — modern types/tools make it
  redundant and it lies when types change.
- **No member prefixes** (`m_description`) — use clean class scope.
- **Interfaces:** prefer no `I` prefix. `ShapeFactory` (interface) +
  `ShapeFactoryImpl`, rather than `IShapeFactory`.

## 7. Avoid Mental Mapping
Don't force the reader to translate `r` into "the lowercase url without host".
Clarity is king; a smart programmer's job is to write code others understand.

## 8. Class Names — Nouns
Classes and objects: **noun / noun phrase**. `Customer`, `WikiPage`, `Account`,
`AddressParser`. Avoid `Manager`, `Processor`, `Data`, `Info` in a class name.
A class name should not be a verb.

## 9. Method Names — Verbs
Methods: **verb / verb phrase**. `postPayment`, `deletePage`, `save`.
Accessors/mutators/predicates prefixed per JavaBean: `getName`, `setName`,
`isPosted`.

When constructors are overloaded, prefer static factory methods with names that
describe the arguments:
```ts
// Prefer
const point = Complex.fromRealNumber(23.0);
// over
const point = new Complex(23.0);
```

## 10. Don't Be Cute
No jokes/slang. `holyHandGrenade` → `deleteItems`. `whack()` → `kill()`.
`eatMyShorts()` → `abort()`. Say what you mean.

## 11. Pick One Word per Concept
One word for one abstract concept across the codebase. Don't mix `fetch`, `retrieve`,
`get` for the same idea. Don't have `controller`, `manager`, and `driver` in the
same code. A consistent lexicon is a gift to maintainers.

## 12. Don't Pun
The flip side of Rule 11: don't use the **same** word for two different ideas.
If `add` means "combine two values" in most places, don't also use `add` for
"put one item into a collection" — that is `insert` or `append`.

## 13. Use Solution-Domain Names
Readers are programmers. Use CS terms, algorithm names, pattern names, math terms.
`AccountVisitor` (Visitor pattern), `JobQueue`. Don't draw every name from the
problem domain.

## 14. Use Problem-Domain Names
When there is no programmer-ese for it, use the **domain** name so a domain expert
can help. Separating solution- and problem-domain concepts is part of a good name.

## 15. Add Meaningful Context
Most names are not meaningful alone. `state` could be address or FSM state.
Give context with well-named classes/functions/namespaces, or as a last resort a
prefix: `addrFirstName`, `addrState`. Better: an `Address` class so `state`
belongs to it.

## 16. Don't Add Gratuitous Context
Don't prefix every class in a "Gas Station Deluxe" app with `GSD`. `GSDAccountAddress`
is noise. Shorter names are better **so long as they are clear**. Add no more
context than necessary.

## 17. Final Word
Naming well requires descriptive skills and a shared cultural background. The
hardest part is the willingness to **rename** when you find a better name — and
modern tools make renaming cheap. Do it; your reviewers will thank you.
