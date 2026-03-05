type RuleWithField = {
  field: string;
};

type SortDialogRuleState<T> = {
  rules: T[];
  selectedIndex: number;
};

function normalizeFieldToken(fieldName: string): string {
  return fieldName.trim().toLowerCase();
}

export function upsertSortRuleByField<T extends RuleWithField>(
  rules: readonly T[],
  nextRule: T
): SortDialogRuleState<T> {
  const normalizedField = normalizeFieldToken(nextRule.field);
  if (!normalizedField) {
    return {
      rules: [...rules],
      selectedIndex: -1
    };
  }

  const existingIndex = rules.findIndex((entry) => normalizeFieldToken(entry.field) === normalizedField);
  if (existingIndex >= 0) {
    const nextRules = [...rules];
    nextRules[existingIndex] = nextRule;
    return {
      rules: nextRules,
      selectedIndex: existingIndex
    };
  }

  return {
    rules: [...rules, nextRule],
    selectedIndex: rules.length
  };
}

export function removeSortRuleAtIndex<T>(
  rules: readonly T[],
  selectedIndex: number
): SortDialogRuleState<T> {
  if (selectedIndex < 0 || selectedIndex >= rules.length) {
    return {
      rules: [...rules],
      selectedIndex: -1
    };
  }

  const nextRules = rules.filter((_, index) => index !== selectedIndex);
  if (nextRules.length === 0) {
    return {
      rules: nextRules,
      selectedIndex: -1
    };
  }

  return {
    rules: nextRules,
    selectedIndex: Math.min(selectedIndex, nextRules.length - 1)
  };
}

export function moveSortRuleByDelta<T>(
  rules: readonly T[],
  selectedIndex: number,
  delta: -1 | 1
): SortDialogRuleState<T> {
  if (selectedIndex < 0 || selectedIndex >= rules.length) {
    return {
      rules: [...rules],
      selectedIndex: -1
    };
  }

  const targetIndex = selectedIndex + delta;
  if (targetIndex < 0 || targetIndex >= rules.length) {
    return {
      rules: [...rules],
      selectedIndex
    };
  }

  const nextRules = [...rules];
  const [entry] = nextRules.splice(selectedIndex, 1);
  nextRules.splice(targetIndex, 0, entry);
  return {
    rules: nextRules,
    selectedIndex: targetIndex
  };
}
