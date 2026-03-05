export type FieldValidationResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

export type FieldAdapter = {
  read: (recordId: string, fieldName: string) => unknown;
  write: (recordId: string, fieldName: string, value: unknown) => void;
  validate: (fieldName: string, value: unknown) => FieldValidationResult;
};

