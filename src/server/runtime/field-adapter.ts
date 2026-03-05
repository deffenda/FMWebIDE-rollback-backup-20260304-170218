import type { FieldAdapter, FieldValidationResult } from "../../fm/objects/FieldAdapter.ts";

type RuntimeFieldAdapterOptions = {
  read: (recordId: string, fieldName: string) => unknown;
  write: (recordId: string, fieldName: string, value: unknown) => void;
  validate?: (fieldName: string, value: unknown) => FieldValidationResult;
};

export function createRuntimeFieldAdapter(options: RuntimeFieldAdapterOptions): FieldAdapter {
  return {
    read(recordId, fieldName) {
      return options.read(recordId, fieldName);
    },
    write(recordId, fieldName, value) {
      options.write(recordId, fieldName, value);
    },
    validate(fieldName, value) {
      if (options.validate) {
        return options.validate(fieldName, value);
      }
      return { ok: true };
    }
  };
}

