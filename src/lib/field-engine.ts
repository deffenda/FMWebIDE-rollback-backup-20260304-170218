import { evaluateFMCalcBoolean, evaluateFMCalcExpression } from "./fmcalc/index.ts";
import type { FMRecord, LayoutComponent, LayoutDefinition } from "./layout-model";

export type FieldValidationRule = {
  fieldName: string;
  fieldType: string;
  required: boolean;
  strictType: boolean;
  rangeMin?: number;
  rangeMax?: number;
  pattern?: string;
  calculation?: string;
  message?: string;
};

export type FieldAutoEnterRule = {
  fieldName: string;
  fieldType: string;
  creationTimestamp: boolean;
  modificationTimestamp: boolean;
  creationAccountName: boolean;
  modificationAccountName: boolean;
  serial: boolean;
  calculation?: string;
};

export type FieldEngineConfig = {
  validationByField: Record<string, FieldValidationRule>;
  autoEnterByField: Record<string, FieldAutoEnterRule>;
};

export type FieldValidationError = {
  fieldName: string;
  code:
    | "required"
    | "type"
    | "rangeMin"
    | "rangeMax"
    | "pattern"
    | "calc";
  message: string;
};

type BuildFieldEngineConfigOptions = {
  layout: LayoutDefinition | null;
  fieldTypeByName: Record<string, string>;
};

type ValidateRecordForCommitOptions = {
  record: FMRecord;
  dirtyFields: Record<string, unknown>;
  config: FieldEngineConfig;
  currentTableOccurrence: string;
};

type ApplyAutoEnterOnCreateOptions = {
  baseFieldData: Record<string, unknown>;
  config: FieldEngineConfig;
  existingRecords: FMRecord[];
  currentTableOccurrence: string;
  accountName: string;
  now?: Date;
};

type ApplyAutoEnterOnModifyOptions = {
  baseFieldData: Record<string, unknown>;
  record: FMRecord;
  config: FieldEngineConfig;
  currentTableOccurrence: string;
  accountName: string;
  now?: Date;
};

function normalizeFieldTypeToken(raw: string | undefined): string {
  const token = String(raw ?? "").trim().toLowerCase();
  if (!token) {
    return "text";
  }
  if (token.includes("number")) {
    return "number";
  }
  if (token.includes("timestamp")) {
    return "timestamp";
  }
  if (token === "date" || token.includes("date")) {
    return "date";
  }
  if (token === "time" || token.includes(" time")) {
    return "time";
  }
  if (token.includes("container")) {
    return "container";
  }
  return "text";
}

function normalizeBoundFieldName(component: LayoutComponent): string {
  const direct = String(component.binding?.field ?? "").trim();
  if (!direct) {
    return "";
  }
  if (!direct.includes("::")) {
    return direct;
  }
  return (direct.split("::").pop() ?? direct).trim();
}

function looksLikeDate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return true;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
    return true;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed);
}

function looksLikeTime(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return true;
  }
  if (/^\d{1,2}:\d{2}\s?(am|pm)$/i.test(trimmed)) {
    return true;
  }
  return false;
}

function normalizeDateForField(now: Date, fieldType: string): string {
  const iso = now.toISOString();
  if (fieldType === "date") {
    return iso.slice(0, 10);
  }
  if (fieldType === "time") {
    return iso.slice(11, 19);
  }
  return iso;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const token = String(value ?? "").trim();
  if (!token) {
    return null;
  }
  const parsed = Number(token.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function maxSerialValue(records: FMRecord[], fieldName: string): number {
  let max = 0;
  for (const record of records) {
    const value = parseNumber(record[fieldName]);
    if (value != null && value > max) {
      max = value;
    }
  }
  return Math.floor(max);
}

export function buildFieldEngineConfig(options: BuildFieldEngineConfigOptions): FieldEngineConfig {
  const validationByField: Record<string, FieldValidationRule> = {};
  const autoEnterByField: Record<string, FieldAutoEnterRule> = {};
  const layout = options.layout;
  if (!layout) {
    return {
      validationByField,
      autoEnterByField
    };
  }

  for (const component of layout.components) {
    if (component.type !== "field") {
      continue;
    }
    const fieldName = normalizeBoundFieldName(component);
    if (!fieldName) {
      continue;
    }

    const typeFromCatalog = options.fieldTypeByName[fieldName] ?? options.fieldTypeByName[component.binding?.field ?? ""];
    const fieldType = normalizeFieldTypeToken(typeFromCatalog);
    const required = Boolean(component.props.validationRequired);
    const strictType = Boolean(component.props.strictDataType) || fieldType === "number" || fieldType === "date" || fieldType === "time" || fieldType === "timestamp";
    const rangeMin = parseNumber(component.props.validationRangeMin);
    const rangeMax = parseNumber(component.props.validationRangeMax);
    const pattern = String(component.props.validationPattern ?? "").trim();
    const calculation = String(component.props.validationCalculation ?? "").trim();
    const message = String(component.props.validationMessage ?? "").trim();

    if (required || strictType || rangeMin != null || rangeMax != null || pattern || calculation) {
      validationByField[fieldName] = {
        fieldName,
        fieldType,
        required,
        strictType,
        rangeMin: rangeMin ?? undefined,
        rangeMax: rangeMax ?? undefined,
        pattern: pattern || undefined,
        calculation: calculation || undefined,
        message: message || undefined
      };
    }

    const autoRule: FieldAutoEnterRule = {
      fieldName,
      fieldType,
      creationTimestamp: Boolean(component.props.autoEnterCreationTimestamp),
      modificationTimestamp: Boolean(component.props.autoEnterModificationTimestamp),
      creationAccountName: Boolean(component.props.autoEnterCreationAccountName),
      modificationAccountName: Boolean(component.props.autoEnterModificationAccountName),
      serial: Boolean(component.props.autoEnterSerial),
      calculation: String(component.props.autoEnterCalculation ?? "").trim() || undefined
    };
    if (
      autoRule.creationTimestamp ||
      autoRule.modificationTimestamp ||
      autoRule.creationAccountName ||
      autoRule.modificationAccountName ||
      autoRule.serial ||
      autoRule.calculation
    ) {
      autoEnterByField[fieldName] = autoRule;
    }
  }

  return {
    validationByField,
    autoEnterByField
  };
}

export function validateRecordForCommit(options: ValidateRecordForCommitOptions): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  for (const [fieldName, rawValue] of Object.entries(options.dirtyFields)) {
    const rule = options.config.validationByField[fieldName];
    if (!rule) {
      continue;
    }
    const textValue = String(rawValue ?? "").trim();

    if (rule.required && textValue.length === 0) {
      errors.push({
        fieldName,
        code: "required",
        message: rule.message || `${fieldName} is required`
      });
      continue;
    }

    if (textValue.length > 0 && rule.strictType) {
      if (rule.fieldType === "number" && parseNumber(rawValue) == null) {
        errors.push({
          fieldName,
          code: "type",
          message: rule.message || `${fieldName} must be a number`
        });
        continue;
      }
      if (rule.fieldType === "date" && !looksLikeDate(textValue)) {
        errors.push({
          fieldName,
          code: "type",
          message: rule.message || `${fieldName} must be a valid date`
        });
        continue;
      }
      if (rule.fieldType === "time" && !looksLikeTime(textValue)) {
        errors.push({
          fieldName,
          code: "type",
          message: rule.message || `${fieldName} must be a valid time`
        });
        continue;
      }
      if (rule.fieldType === "timestamp" && !Number.isFinite(Date.parse(textValue))) {
        errors.push({
          fieldName,
          code: "type",
          message: rule.message || `${fieldName} must be a valid timestamp`
        });
        continue;
      }
    }

    const numericValue = parseNumber(rawValue);
    if (rule.rangeMin != null && numericValue != null && numericValue < rule.rangeMin) {
      errors.push({
        fieldName,
        code: "rangeMin",
        message: rule.message || `${fieldName} must be at least ${rule.rangeMin}`
      });
      continue;
    }
    if (rule.rangeMax != null && numericValue != null && numericValue > rule.rangeMax) {
      errors.push({
        fieldName,
        code: "rangeMax",
        message: rule.message || `${fieldName} must be at most ${rule.rangeMax}`
      });
      continue;
    }

    if (rule.pattern) {
      try {
        const regex = new RegExp(rule.pattern);
        if (!regex.test(textValue)) {
          errors.push({
            fieldName,
            code: "pattern",
            message: rule.message || `${fieldName} does not match required format`
          });
          continue;
        }
      } catch {
        // Invalid regex should not crash commits; fall through.
      }
    }

    if (rule.calculation) {
      const calcResult = evaluateFMCalcBoolean(rule.calculation, {
        currentTableOccurrence: options.currentTableOccurrence,
        currentRecord: {
          ...options.record,
          ...options.dirtyFields
        }
      });
      if (calcResult.ok && calcResult.value === false) {
        errors.push({
          fieldName,
          code: "calc",
          message: rule.message || `${fieldName} failed validation calculation`
        });
      }
    }
  }
  return errors;
}

export function applyAutoEnterOnCreate(options: ApplyAutoEnterOnCreateOptions): Record<string, unknown> {
  const now = options.now ?? new Date();
  const next = {
    ...options.baseFieldData
  };

  for (const rule of Object.values(options.config.autoEnterByField)) {
    if (rule.creationTimestamp) {
      next[rule.fieldName] = normalizeDateForField(now, rule.fieldType);
    }
    if (rule.creationAccountName) {
      next[rule.fieldName] = options.accountName;
    }
    if (rule.serial) {
      next[rule.fieldName] = maxSerialValue(options.existingRecords, rule.fieldName) + 1;
    }
    if (rule.calculation) {
      const calc = evaluateFMCalcExpression(rule.calculation, {
        currentTableOccurrence: options.currentTableOccurrence,
        currentRecord: next
      });
      if (calc.ok) {
        next[rule.fieldName] = calc.value as unknown;
      }
    }
    if (rule.modificationTimestamp && next[rule.fieldName] == null) {
      next[rule.fieldName] = normalizeDateForField(now, rule.fieldType);
    }
    if (rule.modificationAccountName && next[rule.fieldName] == null) {
      next[rule.fieldName] = options.accountName;
    }
  }

  return next;
}

export function applyAutoEnterOnModify(options: ApplyAutoEnterOnModifyOptions): Record<string, unknown> {
  const now = options.now ?? new Date();
  const next = {
    ...options.baseFieldData
  };

  for (const rule of Object.values(options.config.autoEnterByField)) {
    if (rule.modificationTimestamp) {
      next[rule.fieldName] = normalizeDateForField(now, rule.fieldType);
    }
    if (rule.modificationAccountName) {
      next[rule.fieldName] = options.accountName;
    }
    if (rule.calculation) {
      const calc = evaluateFMCalcExpression(rule.calculation, {
        currentTableOccurrence: options.currentTableOccurrence,
        currentRecord: {
          ...options.record,
          ...next
        }
      });
      if (calc.ok) {
        next[rule.fieldName] = calc.value as unknown;
      }
    }
  }

  return next;
}
