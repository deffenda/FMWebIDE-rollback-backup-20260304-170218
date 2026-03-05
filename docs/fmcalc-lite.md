# FMCalc-lite

`FMCalc-lite` is a safe, sandboxed expression evaluator used by runtime rendering in Browse/Find mode.

Source:
- `/Users/deffenda/Code/FMWebIDE/src/lib/fmcalc/index.ts`

## Supported syntax

- Field references
  - Unqualified: `Name`
  - Qualified: `Assets::Name`, `Assignments::Note`
- Literals
  - Text: `"hello"`
  - Number: `123`, `99.5`
  - Boolean: `True`, `False`
- Comparison operators
  - `=`, `≠`/`<>`/`!=`, `<`, `≤`/`<=`, `>`, `≥`/`>=`
- Logical operators
  - `And`, `Or`, `Not`
- Concatenation
  - `&`
- Functions
  - `IsEmpty(value)`
  - `IsValid(value)`
  - `PatternCount(text; pattern)` (also accepts comma separators)
  - `If(condition; then; else)`
  - `Case(condition1; result1; ...; default)`
  - `Get(RecordID|CurrentDate|CurrentTime|CurrentTimestamp|LayoutName|AccountName|FoundCount)`
  - Text:
    - `Length(text)`
    - `Left(text; count)`
    - `Right(text; count)`
    - `Middle(text; start; count)`
    - `Lower(text)`
    - `Upper(text)`
    - `Proper(text)`
    - `Trim(text)`
    - `TrimAll(text)`
    - `Substitute(text; search; replace; ...)`
    - `Position(text; search; start; occurrence)`
    - `Filter(text; allowedChars)`
    - `List(value1; value2; ...)`
    - `ValueCount(listText)`
    - `GetValue(listText; index)`
    - `Char(codePoint)`
    - `Code(text)`
    - `GetAsText(value)`
    - `GetAsNumber(value)`
  - Numeric:
    - `Abs(number)`
    - `Int(number)`
    - `Round(number; precision)`
    - `Ceiling(number)`
    - `Floor(number)`
    - `Mod(number; divisor)`
    - `Min(value1; value2; ...)`
    - `Max(value1; value2; ...)`
    - `Sum(value1; value2; ...)`
    - `Average(value1; value2; ...)`
    - `Truncate(number; precision)`
    - `Random()`
  - Date/time:
    - `Date(year; month; day)`
    - `Time(hour; minute; second)`
    - `Day(date)`
    - `Month(date)`
    - `Year(date)`
    - `Hour(time)`
    - `Minute(time)`
    - `Second(time)`

## Evaluation context

Runtime calls pass:
- `currentRecord`
- `currentTableOccurrence`
- `relatedRecord` (for portal row context)
- `relatedTableOccurrence`

Resolution rules:
- Qualified references prefer matching table occurrence.
- Unqualified references resolve current record first, then related record fallback.

## Runtime integration points

- `hideObjectWhen` (Boolean)
- Tooltip expressions (Text)
- `portalFilterCalculation` (Boolean per portal row)
- Panel/tab calculation expressions (Text/Boolean fallback)

Current integration file:
- `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

## Error handling behavior

- No use of `eval()` or dynamic JS execution.
- Parse/evaluation failures return `{ ok: false, error }`.
- Runtime degrades safely:
  - `hideObjectWhen` errors default to visible.
  - Tooltip calc errors default to empty tooltip.
  - Portal filter calc errors keep row visible.
- Volatile calcs (`Random()` and `Get(CurrentDate/Time/Timestamp)`) bypass expression result caching.
- When `?debugRuntime=1` is enabled, calc errors are shown in the debug overlay.
