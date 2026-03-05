import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateFMCalcBoolean,
  evaluateFMCalcExpression,
  evaluateFMCalcText
} from "./index.ts";

const context = {
  currentTableOccurrence: "Assets",
  currentRecord: {
    recordId: "101",
    Name: "MacBook Pro",
    Price: 2499,
    Status: "Active",
    EmptyField: ""
  },
  relatedTableOccurrence: "Assignments",
  relatedRecord: {
    recordId: "701",
    "Assignments::Name": "Avery Chen",
    "Assignments::Date Returned": "2026-03-01",
    Note: "Checked out"
  }
} as const;

test("evaluates literal + comparison operators", () => {
  assert.equal(evaluateFMCalcBoolean("1 = 1", context).value, true);
  assert.equal(evaluateFMCalcBoolean("2 > 1", context).value, true);
  assert.equal(evaluateFMCalcBoolean("2 < 1", context).value, false);
  assert.equal(evaluateFMCalcBoolean("2 ≥ 2", context).value, true);
  assert.equal(evaluateFMCalcBoolean("2 ≤ 2", context).value, true);
  assert.equal(evaluateFMCalcBoolean("2 ≠ 1", context).value, true);
});

test("evaluates field references (qualified and unqualified)", () => {
  assert.equal(evaluateFMCalcText("Name", context).value, "MacBook Pro");
  assert.equal(evaluateFMCalcText("Assets::Name", context).value, "MacBook Pro");
  assert.equal(evaluateFMCalcText("Assignments::Name", context).value, "Avery Chen");
  assert.equal(evaluateFMCalcText("Assignments::Date Returned", context).value, "2026-03-01");
});

test("evaluates logical expressions with And/Or/Not", () => {
  assert.equal(evaluateFMCalcBoolean("Price > 1000 and Status = \"Active\"", context).value, true);
  assert.equal(evaluateFMCalcBoolean("Price > 1000 and not IsEmpty(Name)", context).value, true);
  assert.equal(evaluateFMCalcBoolean("Price < 1000 or Status = \"Active\"", context).value, true);
});

test("evaluates IsEmpty / IsValid / PatternCount", () => {
  assert.equal(evaluateFMCalcBoolean("IsEmpty(EmptyField)", context).value, true);
  assert.equal(evaluateFMCalcBoolean("IsValid(Name)", context).value, true);
  assert.equal(evaluateFMCalcExpression("PatternCount(Name; \"pro\")", context).value, 1);
});

test("evaluates If and Case", () => {
  assert.equal(
    evaluateFMCalcText("If(Price > 2000; \"Premium\"; \"Standard\")", context).value,
    "Premium"
  );
  assert.equal(
    evaluateFMCalcText("Case(Status = \"Active\"; \"Open\"; \"Closed\")", context).value,
    "Open"
  );
});

test("evaluates Get(RecordID)", () => {
  assert.equal(evaluateFMCalcText("Get(RecordID)", context).value, "701");
  assert.equal(
    evaluateFMCalcText("Get(RecordID)", {
      currentTableOccurrence: "Assets",
      currentRecord: { recordId: "202" }
    }).value,
    "202"
  );
});

test("evaluates concatenation", () => {
  assert.equal(
    evaluateFMCalcText("\"Asset: \" & Name & \" (\" & Price & \")\"", context).value,
    "Asset: MacBook Pro (2499)"
  );
});

test("evaluates common text functions", () => {
  assert.equal(evaluateFMCalcExpression("Length(Name)", context).value, 11);
  assert.equal(evaluateFMCalcText("Left(Name; 3)", context).value, "Mac");
  assert.equal(evaluateFMCalcText("Right(Name; 3)", context).value, "Pro");
  assert.equal(evaluateFMCalcText("Middle(Name; 2; 4)", context).value, "acBo");
  assert.equal(evaluateFMCalcText("Lower(\"HELLO\")", context).value, "hello");
  assert.equal(evaluateFMCalcText("Upper(\"hello\")", context).value, "HELLO");
  assert.equal(evaluateFMCalcText("Proper(\"mAcBook PRO\")", context).value, "Macbook Pro");
  assert.equal(evaluateFMCalcText("Trim(\"  asset  \")", context).value, "asset");
  assert.equal(evaluateFMCalcText("TrimAll(\"  asset   manager\nportal  \")", context).value, "asset manager portal");
  assert.equal(
    evaluateFMCalcText("Substitute(\"one two two\"; \"two\"; \"3\")", context).value,
    "one 3 3"
  );
  assert.equal(evaluateFMCalcExpression("Position(Name; \"Book\"; 1; 1)", context).value, 4);
  assert.equal(evaluateFMCalcText("Filter(\"A1-B2\"; \"AB12\")", context).value, "A1B2");
  assert.equal(evaluateFMCalcText("List(\"a\"; \"\"; \"b\"; \"c\")", context).value, "a\nb\nc");
  assert.equal(evaluateFMCalcExpression("ValueCount(\"a\nb\n\")", context).value, 3);
  assert.equal(evaluateFMCalcText("GetValue(\"a\nb\nc\"; 2)", context).value, "b");
  assert.equal(evaluateFMCalcText("Char(65)", context).value, "A");
  assert.equal(evaluateFMCalcExpression("Code(\"Apple\")", context).value, 65);
  assert.equal(evaluateFMCalcText("GetAsText(Price)", context).value, "2499");
  assert.equal(evaluateFMCalcExpression("GetAsNumber(\"2,499\")", context).value, 2499);
});

test("evaluates common numeric functions", () => {
  assert.equal(evaluateFMCalcExpression("Abs(\"-9\")", context).value, 9);
  assert.equal(evaluateFMCalcExpression("Int(\"-9.8\")", context).value, -9);
  assert.equal(evaluateFMCalcExpression("Round(12.345; 2)", context).value, 12.35);
  assert.equal(evaluateFMCalcExpression("Ceiling(1.2)", context).value, 2);
  assert.equal(evaluateFMCalcExpression("Floor(1.8)", context).value, 1);
  assert.equal(evaluateFMCalcExpression("Mod(10; 3)", context).value, 1);
  assert.equal(evaluateFMCalcExpression("Min(9; 3; 7)", context).value, 3);
  assert.equal(evaluateFMCalcExpression("Max(9; 3; 7)", context).value, 9);
  assert.equal(evaluateFMCalcExpression("Sum(9; 3; 7)", context).value, 19);
  assert.equal(evaluateFMCalcExpression("Average(9; 3; 7)", context).value, 19 / 3);
  assert.equal(evaluateFMCalcExpression("Truncate(12.987; 2)", context).value, 12.98);
});

test("evaluates common date/time + volatile get functions", () => {
  const fixedNow = {
    ...context,
    currentLayoutName: "Asset Details",
    currentAccountName: "web-api",
    variables: {
      __foundCount: 42
    },
    now: "2026-03-03T14:15:16Z"
  } as const;
  assert.equal(evaluateFMCalcText("Date(2026; 3; 3)", context).value, "2026-03-03");
  assert.equal(evaluateFMCalcText("Time(14; 15; 16)", context).value, "14:15:16");
  assert.equal(evaluateFMCalcExpression("Year(\"2026-03-03\")", context).value, 2026);
  assert.equal(evaluateFMCalcExpression("Month(\"2026-03-03\")", context).value, 3);
  assert.equal(evaluateFMCalcExpression("Day(\"2026-03-03\")", context).value, 3);
  assert.equal(evaluateFMCalcExpression("Hour(\"2026-03-03T14:15:16Z\")", context).value, 14);
  assert.equal(evaluateFMCalcExpression("Minute(\"2026-03-03T14:15:16Z\")", context).value, 15);
  assert.equal(evaluateFMCalcExpression("Second(\"2026-03-03T14:15:16Z\")", context).value, 16);
  assert.equal(evaluateFMCalcText("Get(CurrentDate)", fixedNow).value, "2026-03-03");
  assert.equal(evaluateFMCalcText("Get(CurrentTime)", fixedNow).value, "14:15:16");
  assert.equal(evaluateFMCalcText("Get(CurrentTimestamp)", fixedNow).value, "2026-03-03 14:15:16");
  assert.equal(evaluateFMCalcText("Get(LayoutName)", fixedNow).value, "Asset Details");
  assert.equal(evaluateFMCalcText("Get(AccountName)", fixedNow).value, "web-api");
  assert.equal(evaluateFMCalcExpression("Get(FoundCount)", fixedNow).value, 42);
});

test("does not cache volatile calculations", () => {
  const samples = Array.from({ length: 5 }, () => evaluateFMCalcExpression("Random()", context));
  for (const sample of samples) {
    assert.equal(sample.ok, true);
  }
  const values = samples
    .filter((entry): entry is { ok: true; value: unknown } => entry.ok)
    .map((entry) => String(entry.value));
  assert.ok(new Set(values).size > 1);
});

test("returns deterministic parse errors without throwing", () => {
  const result = evaluateFMCalcExpression("If((Name = \"A\"; 1; 0", context);
  assert.equal(result.ok, false);
  assert.match((result.ok ? "" : result.error) ?? "", /Expected '\)'|Unexpected token/i);
});
