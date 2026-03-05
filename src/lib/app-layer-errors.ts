export type AppLayerErrorCode =
  | "CONFIG_MISSING"
  | "NOT_AUTHORIZED"
  | "NOT_SUPPORTED"
  | "DEPENDENCY_MISSING";

export type AppLayerErrorState = {
  code: AppLayerErrorCode;
  message: string;
  details?: string;
};

export const appLayerErrorLabels: Record<AppLayerErrorCode, string> = {
  CONFIG_MISSING: "Configuration missing",
  NOT_AUTHORIZED: "Not authorized",
  NOT_SUPPORTED: "Not supported",
  DEPENDENCY_MISSING: "Dependency missing"
};

export function buildAppLayerError(
  code: AppLayerErrorCode,
  message: string,
  details?: string
): AppLayerErrorState {
  return {
    code,
    message: message.trim() || appLayerErrorLabels[code],
    details: details?.trim() || undefined
  };
}
