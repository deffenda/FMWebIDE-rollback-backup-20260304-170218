const FONT_MAP: Record<string, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  "times new roman": "'Times New Roman', Times, serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
  "courier new": "'Courier New', Courier, monospace",
  georgia: "Georgia, 'Times New Roman', serif",
  verdana: "Verdana, Geneva, sans-serif",
  tahoma: "Tahoma, Verdana, sans-serif",
  "segoe ui": "'Segoe UI', Tahoma, sans-serif",
  avenir: "Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  calibri: "Calibri, 'Segoe UI', Arial, sans-serif"
};

export function resolveFmFontStack(fontFamily: string | undefined): string {
  const token = String(fontFamily ?? "").trim();
  if (!token) {
    return FONT_MAP.helvetica;
  }
  const lower = token.toLowerCase();
  return FONT_MAP[lower] ?? `${token}, ${FONT_MAP.helvetica}`;
}

