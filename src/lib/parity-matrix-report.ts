export type RawParityStatus = "Implemented" | "Partial" | "Missing" | "Unknown";
export type ParitySupportStatus = "supported" | "partial" | "unsupported" | "unknown";
export type ParityUncertainty = "low" | "med" | "high";

export type ParityEvidenceEntry = {
  file: string;
  line: number;
  reason?: string;
  excerpt?: string;
};

export type ParityStatusSourceItem = {
  id: string;
  category: string;
  subcategory: string;
  capability_name: string;
  expected_filemaker_behavior: string;
  suggested_validation_test: string;
  uncertainty_level: ParityUncertainty;
  status: RawParityStatus;
  evidence: ParityEvidenceEntry[];
};

export type ParityMatrixFeature = {
  id: string;
  category: string;
  subcategory: string;
  capabilityName: string;
  expectedFileMakerBehavior: string;
  suggestedValidationTest: string;
  uncertainty: ParityUncertainty;
  sourceStatus: RawParityStatus;
  supportStatus: ParitySupportStatus;
  evidence: Array<{
    file: string;
    line: number;
    reason?: string;
  }>;
};

export type ParityMatrixReport = {
  version: 1;
  generatedAt: string;
  sourceFingerprint: string;
  summary: {
    total: number;
    supported: number;
    partial: number;
    unsupported: number;
    unknown: number;
  };
  features: ParityMatrixFeature[];
};

export const PARITY_MATRIX_REPORT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://fmweb-ide.local/schemas/parity-matrix-report.schema.json",
  title: "FMWebParityMatrixReport",
  type: "object",
  required: ["version", "generatedAt", "sourceFingerprint", "summary", "features"],
  properties: {
    version: {
      type: "integer",
      const: 1
    },
    generatedAt: {
      type: "string"
    },
    sourceFingerprint: {
      type: "string"
    },
    summary: {
      type: "object",
      required: ["total", "supported", "partial", "unsupported", "unknown"],
      properties: {
        total: { type: "integer", minimum: 0 },
        supported: { type: "integer", minimum: 0 },
        partial: { type: "integer", minimum: 0 },
        unsupported: { type: "integer", minimum: 0 },
        unknown: { type: "integer", minimum: 0 }
      }
    },
    features: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "category",
          "subcategory",
          "capabilityName",
          "expectedFileMakerBehavior",
          "suggestedValidationTest",
          "uncertainty",
          "sourceStatus",
          "supportStatus",
          "evidence"
        ],
        properties: {
          id: { type: "string" },
          category: { type: "string" },
          subcategory: { type: "string" },
          capabilityName: { type: "string" },
          expectedFileMakerBehavior: { type: "string" },
          suggestedValidationTest: { type: "string" },
          uncertainty: {
            type: "string",
            enum: ["low", "med", "high"]
          },
          sourceStatus: {
            type: "string",
            enum: ["Implemented", "Partial", "Missing", "Unknown"]
          },
          supportStatus: {
            type: "string",
            enum: ["supported", "partial", "unsupported", "unknown"]
          },
          evidence: {
            type: "array",
            items: {
              type: "object",
              required: ["file", "line"],
              properties: {
                file: { type: "string" },
                line: { type: "integer", minimum: 1 },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
} as const;

export function toParitySupportStatus(status: RawParityStatus): ParitySupportStatus {
  if (status === "Implemented") {
    return "supported";
  }
  if (status === "Partial") {
    return "partial";
  }
  if (status === "Missing") {
    return "unsupported";
  }
  return "unknown";
}

export function createParityMatrixReport(
  sourceItems: ParityStatusSourceItem[],
  options: {
    generatedAt: string;
    sourceFingerprint: string;
  }
): ParityMatrixReport {
  const features = sourceItems
    .map<ParityMatrixFeature>((item) => ({
      id: String(item.id ?? "").trim(),
      category: String(item.category ?? "").trim(),
      subcategory: String(item.subcategory ?? "").trim(),
      capabilityName: String(item.capability_name ?? "").trim(),
      expectedFileMakerBehavior: String(item.expected_filemaker_behavior ?? "").trim(),
      suggestedValidationTest: String(item.suggested_validation_test ?? "").trim(),
      uncertainty: item.uncertainty_level,
      sourceStatus: item.status,
      supportStatus: toParitySupportStatus(item.status),
      evidence: (Array.isArray(item.evidence) ? item.evidence : [])
        .map((entry) => ({
          file: String(entry.file ?? "").trim(),
          line: Number.isFinite(entry.line) ? Math.max(1, Math.floor(entry.line)) : 1,
          reason: entry.reason ? String(entry.reason).trim() : undefined
        }))
        .filter((entry) => entry.file.length > 0)
        .sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line)
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const summary = features.reduce(
    (acc, item) => {
      if (item.supportStatus === "supported") {
        acc.supported += 1;
      } else if (item.supportStatus === "partial") {
        acc.partial += 1;
      } else if (item.supportStatus === "unsupported") {
        acc.unsupported += 1;
      } else {
        acc.unknown += 1;
      }
      return acc;
    },
    {
      total: features.length,
      supported: 0,
      partial: 0,
      unsupported: 0,
      unknown: 0
    }
  );

  return {
    version: 1,
    generatedAt: String(options.generatedAt ?? "").trim() || new Date().toISOString(),
    sourceFingerprint: String(options.sourceFingerprint ?? "").trim() || "unknown",
    summary,
    features
  };
}

export function isParityMatrixReport(value: unknown): value is ParityMatrixReport {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ParityMatrixReport>;
  if (candidate.version !== 1) {
    return false;
  }
  if (!candidate.summary || typeof candidate.summary !== "object") {
    return false;
  }
  if (!Array.isArray(candidate.features)) {
    return false;
  }
  return true;
}
