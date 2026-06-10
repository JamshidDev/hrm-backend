# Code Complete — The Power of Variable Names (Steve McConnell, Ch. 11)

McConnell's empirically grounded rules for naming data.

## The Most Important Naming Consideration
A name should **fully and accurately describe the entity** the variable
represents. State the *what*, not the *how*.

| Purpose | Bad | Good |
|---|---|---|
| running total | `x`, `xx`, `total` | `runningTotal`, `cumulativeRevenue` |
| current date | `cd`, `current` | `currentDate`, `todaysDate` |
| velocity | `v`, `vel` | `velocity`, `trainVelocity` |

A good name is usually a **problem-oriented** phrase (what is being solved), not a
solution-oriented one (how the computer does it).

## Optimal Name Length
Research (Gorla, Benander) shows debugging effort is lowest when names are
**10–16 characters**. Names of 8–20 characters are a safe target. Too short
(`x`, `n`) loses meaning; too long becomes unwieldy.

```ts
// Too short
n, np, ntw
// Too long
numberOfPeopleOnTheUsOlympicTeam
// Just right
numTeamMembers, teamMemberCount
```

## Computed-Value Qualifiers Go at the End
Put `Total`, `Sum`, `Average`, `Max`, `Min`, `Record`, `String`, `Pointer`
**at the end** of the name. Consistency makes pairs read naturally and avoids
confusing `totalRevenue` vs `revenueTotal` mixing.

```ts
revenueTotal, revenueAverage, revenueMax, revenueMin
// not: totalRevenue, averageRevenue, maximumRevenue
```

Exception: a leading `num`/`count` is often clearer — pick one convention.
`numCustomers` (count of customers) vs `customerCount`. Choose and stick to it;
do **not** use `num` as both a count prefix and an index.

## Naming Specific Kinds of Data

### Loop indices
Beyond trivial loops, name the index meaningfully. `for (teamIndex…)` beats
`for (i…)` once loops nest. If you keep `i`, `j`, `k`, never let them outlive the
loop.

### Status / flag variables
**Never name a variable `flag`.** Name the condition it represents. Boolean
status reads as a question or a state.

```ts
// Bad
if (flag) ...
if (statusFlag & 0x0F) ...
// Good
if (isPrinterReady) ...
if (dataIsReady) ...
if (reportType === ReportType.Annual) ...
```

### Temporary variables
`temp`, `tmp`, `x` signal the developer didn't understand the value. Almost every
"temp" has a real role — name it: `urgentBalance`, `discountedTotal`,
`sqrtDiscriminant`.

### Boolean variables
- Use names that imply true/false: `done`, `error`, `found`, `success`.
- Prefer positive names — `isFound` over `isNotFound`; `isError` over `isNotError`.
  Negatives force a double-negative at the call site (`if (!isNotFound)`).
- Common boolean names: `done`, `error`, `found`, `success`/`ok`. Refine `success`
  to what succeeded when you can.

### Enumerated types
Use a group prefix so members are clearly related:
`Color.Red`, `Color.Green`; `Planet.Earth`, `Planet.Mars`.

### Constants
Name a constant for the **abstract entity** it represents, not the number:
`CYCLES_NEEDED`, not `FIVE`. `MAX_ROWS`, not `TWELVE`.

## Naming Conventions — Why & When
Conventions matter when: multiple people work the project, you'll hand code off,
programs are reviewed, the program is large, or it has a long life. A convention
removes a class of decisions so you spend brainpower on the problem.

A good convention distinguishes:
- variable vs constant vs type/class vs member
- local vs class vs global scope
- the type/intent of a variable

## Standardized Prefixes & Opposites
Use precise **opposite pairs** to keep symmetry:

```
begin/end      first/last     locked/unlocked
min/max        next/previous  source/destination
old/new        up/down        get/set
open/close     show/hide      add/remove / create/delete
```

`oldMaximumStock` ↔ `newMaximumStock` reads cleanly; `oldMaxStock` vs
`maximumStockNew` does not.

## The Kinds of Names to Avoid (McConnell's checklist)
- Misleading names or abbreviations.
- Names with similar meanings (`fileNumber` vs `fileIndex` — pick one role each).
- Names that differ only slightly (`clientRecs` vs `clientReps`).
- Names that sound alike when read aloud (`wrap` vs `rap`).
- Numerals in names where letters were meant (`file1`, `file2` → `inputFile`,
  `outputFile`).
- Misspelled words, or words commonly misspelled in two ways.
- Names that conflict with standard-library or platform names.
- Totally arbitrary names; hard-to-type names; names containing hard-to-read
  characters (`l`/`1`, `O`/`0`).
