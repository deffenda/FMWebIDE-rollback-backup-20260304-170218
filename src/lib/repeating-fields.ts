export type RepetitionRange = {
  from: number;
  to: number;
};

export function normalizeRepetitionRange(fromRaw: unknown, toRaw: unknown): RepetitionRange {
  const from = Math.max(1, Math.round(Number(fromRaw ?? 1) || 1));
  const to = Math.max(from, Math.round(Number(toRaw ?? from) || from));
  return {
    from,
    to
  };
}

export function parseRepeatingValues(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry ?? ""));
  }
  if (raw == null) {
    return [];
  }
  if (typeof raw === "string") {
    return raw.includes("\n") ? raw.split(/\r?\n/) : [raw];
  }
  return [String(raw)];
}

export function resolveRepetitionValues(
  raw: unknown,
  range: RepetitionRange
): Array<{ repetition: number; value: string }> {
  const parsed = parseRepeatingValues(raw);
  const output: Array<{ repetition: number; value: string }> = [];
  for (let repetition = range.from; repetition <= range.to; repetition += 1) {
    output.push({
      repetition,
      value: parsed[repetition - 1] ?? ""
    });
  }
  return output;
}

export function applyRepetitionValueChange(
  raw: unknown,
  repetition: number,
  value: string
): string[] {
  const values = parseRepeatingValues(raw);
  const targetIndex = Math.max(0, Math.round(Number(repetition) || 1) - 1);
  while (values.length <= targetIndex) {
    values.push("");
  }
  values[targetIndex] = value;
  return values;
}
