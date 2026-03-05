#!/usr/bin/env node

import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DDR_PATH = "/Users/deffenda/Downloads/Assets.xml";

function decodeXmlEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_match, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttributes(tag) {
  const attrs = {};
  const attrPattern = /([A-Za-z_][\w:.-]*)="([^"]*)"/g;
  let match = attrPattern.exec(tag);
  while (match) {
    attrs[match[1]] = decodeXmlEntities(match[2]);
    match = attrPattern.exec(tag);
  }
  return attrs;
}

function findTopLevelTagBlocks(xml, tagName) {
  const tokenPattern = new RegExp(`<${tagName}\\b[^>]*>|</${tagName}>`, "g");
  const blocks = [];
  let depth = 0;
  let start = -1;
  let startTag = "";
  let startTagEnd = -1;

  let token = tokenPattern.exec(xml);
  while (token) {
    const value = token[0];
    const index = token.index;
    if (value.startsWith(`</${tagName}>`)) {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          const end = index + value.length;
          blocks.push({
            start,
            end,
            full: xml.slice(start, end),
            inner: xml.slice(startTagEnd, index),
            startTag
          });
          start = -1;
          startTag = "";
          startTagEnd = -1;
        }
      }
      token = tokenPattern.exec(xml);
      continue;
    }

    if (depth === 0) {
      start = index;
      startTag = value;
      startTagEnd = index + value.length;
    }
    depth += 1;
    token = tokenPattern.exec(xml);
  }

  return blocks;
}

function stripTopLevelLayoutObjects(xml) {
  const objectBlocks = findTopLevelTagBlocks(xml, "LayoutObject");
  if (objectBlocks.length === 0) {
    return xml;
  }

  let cursor = 0;
  const parts = [];
  for (const block of objectBlocks) {
    parts.push(xml.slice(cursor, block.start));
    cursor = block.end;
  }
  parts.push(xml.slice(cursor));
  return parts.join("");
}

function numberOr(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const DDR_OBJECT_FLAG_DONT_ANCHOR_LEFT = 0x10000000;
const DDR_OBJECT_FLAG_DONT_ANCHOR_TOP = 0x20000000;
const DDR_OBJECT_FLAG_ANCHOR_RIGHT = 0x40000000;
const DDR_OBJECT_FLAG_ANCHOR_BOTTOM = 0x80000000;

function parseObjectFlagBits(rawValue) {
  const token = String(rawValue ?? "").trim();
  if (!token) {
    return null;
  }
  const parsed = Number.parseInt(token, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed >>> 0;
}

function decodeAutosizeFromObjectFlags(flagBits) {
  if (flagBits == null || !Number.isFinite(flagBits)) {
    return {
      left: true,
      top: true,
      right: false,
      bottom: false,
      source: "default"
    };
  }
  const bits = Number(flagBits) >>> 0;
  return {
    left: (bits & DDR_OBJECT_FLAG_DONT_ANCHOR_LEFT) === 0,
    top: (bits & DDR_OBJECT_FLAG_DONT_ANCHOR_TOP) === 0,
    right: (bits & DDR_OBJECT_FLAG_ANCHOR_RIGHT) !== 0,
    bottom: (bits & DDR_OBJECT_FLAG_ANCHOR_BOTTOM) !== 0,
    source: "flags"
  };
}

function parseBounds(layoutObjectXml) {
  const tagMatch = layoutObjectXml.match(/<Bounds\b[^>]*>/i);
  if (!tagMatch) {
    return {
      top: 0,
      left: 0,
      bottom: 40,
      right: 200,
      missing: true
    };
  }
  const attrs = parseAttributes(tagMatch[0]);
  return {
    top: numberOr(attrs.top, 0),
    left: numberOr(attrs.left, 0),
    bottom: numberOr(attrs.bottom, 40),
    right: numberOr(attrs.right, 200),
    missing: false
  };
}

function roundTo(value, decimals = 3) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseCssLength(value) {
  const token = String(value ?? "").trim();
  if (!token) {
    return null;
  }
  const match = token.match(/(-?\d+(?:\.\d+)?)(pt|px|%)?/i);
  if (!match) {
    return null;
  }
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }
  return amount;
}

function normalizeCssColorToken(token) {
  const raw = String(token ?? "").trim();
  if (!raw) {
    return "";
  }
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    return raw.toUpperCase();
  }

  const rgba = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgba) {
    return raw;
  }
  const parts = rgba[1].split(",").map((part) => part.trim());
  if (parts.length < 3) {
    return raw;
  }
  const normalizeChannel = (value) => {
    if (value.endsWith("%")) {
      const ratio = Number.parseFloat(value.slice(0, -1));
      if (Number.isFinite(ratio)) {
        return Math.max(0, Math.min(255, Math.round((ratio / 100) * 255)));
      }
      return 0;
    }
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.max(0, Math.min(255, Math.round(numeric)));
  };
  const red = normalizeChannel(parts[0]);
  const green = normalizeChannel(parts[1]);
  const blue = normalizeChannel(parts[2]);
  if (parts.length >= 4) {
    const alphaRaw = Number.parseFloat(parts[3].replace(/%$/, ""));
    const alpha = Number.isFinite(alphaRaw)
      ? parts[3].includes("%")
        ? Math.max(0, Math.min(1, alphaRaw / 100))
        : Math.max(0, Math.min(1, alphaRaw))
      : 1;
    return `rgba(${red}, ${green}, ${blue}, ${roundTo(alpha, 3)})`;
  }
  return `rgb(${red}, ${green}, ${blue})`;
}

function pickFirstNonEmpty(...tokens) {
  for (const token of tokens) {
    const value = String(token ?? "").trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function parseCssDeclarationMap(localCssRaw) {
  const decoded = decodeXmlEntities(localCssRaw ?? "");
  if (!decoded.trim()) {
    return {};
  }

  const preferredBlock =
    firstMatchValue(decoded, /self:normal[\s\S]*?\{([\s\S]*?)\}/i) ||
    firstMatchValue(decoded, /\.self[\s\S]*?\{([\s\S]*?)\}/i) ||
    decoded;
  const declarations = {};
  const pieces = preferredBlock.split(";");
  for (const piece of pieces) {
    const separator = piece.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const key = piece.slice(0, separator).trim().toLowerCase();
    const value = piece.slice(separator + 1).trim();
    if (!key || !value) {
      continue;
    }
    declarations[key] = value;
  }
  return declarations;
}

function extractLocalCssStyles(layoutObjectXml) {
  const localCssRaw = firstMatchValue(layoutObjectXml, /<LocalCSS>([\s\S]*?)<\/LocalCSS>/i);
  if (!localCssRaw) {
    return null;
  }
  const declarations = parseCssDeclarationMap(localCssRaw);
  if (Object.keys(declarations).length === 0) {
    return null;
  }

  const borderColor = pickFirstNonEmpty(
    declarations["border-color"],
    declarations["border-top-color"],
    declarations["border-right-color"],
    declarations["border-bottom-color"],
    declarations["border-left-color"]
  );
  const borderWidth = pickFirstNonEmpty(
    declarations["border-width"],
    declarations["border-top-width"],
    declarations["border-right-width"],
    declarations["border-bottom-width"],
    declarations["border-left-width"]
  );
  const borderStyle = pickFirstNonEmpty(
    declarations["border-style"],
    declarations["border-top-style"],
    declarations["border-right-style"],
    declarations["border-bottom-style"],
    declarations["border-left-style"]
  );

  let fillType = "";
  let fillColor = "";
  let fillGradientStartColor = "";
  let fillGradientEndColor = "";
  const backgroundColor = declarations["background-color"];
  const backgroundImage = declarations["background-image"];
  if (backgroundImage && /gradient/i.test(backgroundImage)) {
    fillType = "gradient";
    const fromColor = firstMatchValue(backgroundImage, /from\(([^)]+)\)/i);
    const toColor = firstMatchValue(backgroundImage, /to\(([^)]+)\)/i);
    fillGradientStartColor = normalizeCssColorToken(fromColor);
    fillGradientEndColor = normalizeCssColorToken(toColor);
    fillColor = fillGradientStartColor || fillGradientEndColor;
  } else if (backgroundImage && !/none/i.test(backgroundImage)) {
    fillType = "image";
  } else if (backgroundColor && !/transparent/i.test(backgroundColor)) {
    fillType = "solid";
    fillColor = normalizeCssColorToken(backgroundColor);
  } else {
    fillType = "none";
  }

  let fontFamily = declarations["font-family"] ?? "";
  const fmFontFamilyToken = firstMatchValue(fontFamily, /-fm-font-family\(([^)]+)\)/i);
  if (fmFontFamilyToken) {
    fontFamily = fmFontFamilyToken.split(/[;,]/)[0]?.trim() ?? fontFamily;
  } else {
    fontFamily = fontFamily.split(/[;,]/)[0]?.trim() ?? fontFamily;
  }

  const fontSize = parseCssLength(declarations["font-size"] ?? "");
  const textColor = normalizeCssColorToken(declarations.color ?? "");
  const textAlign = (declarations["text-align"] ?? "").trim().toLowerCase();
  const fontStyle = (declarations["font-style"] ?? "").trim().toLowerCase();
  const fontWeightValue = parseCssLength(declarations["font-weight"] ?? "");
  const fontWeightToken = (declarations["font-weight"] ?? "").trim().toLowerCase();
  const isBold = fontWeightToken === "bold" || (Number.isFinite(fontWeightValue) && fontWeightValue >= 600);
  const isItalic = fontStyle === "italic" || fontStyle === "oblique";
  const borderRadius = parseCssLength(
    pickFirstNonEmpty(
      declarations["border-radius"],
      declarations["border-top-left-radius"],
      declarations["border-top-right-radius"],
      declarations["border-bottom-left-radius"],
      declarations["border-bottom-right-radius"]
    )
  );
  const opacity = Number.parseFloat(String(declarations.opacity ?? ""));
  const paddingTop = parseCssLength(declarations["padding-top"]);
  const paddingRight = parseCssLength(declarations["padding-right"]);
  const paddingBottom = parseCssLength(declarations["padding-bottom"]);
  const paddingLeft = parseCssLength(declarations["padding-left"]);

  return {
    fillType,
    fillColor,
    fillGradientStartColor,
    fillGradientEndColor,
    lineColor: normalizeCssColorToken(borderColor),
    lineWidth: borderWidth ? parseCssLength(borderWidth) : null,
    lineStyle: /dashed/i.test(borderStyle) ? "dashed" : /none/i.test(borderStyle) ? "none" : "solid",
    cornerRadius: borderRadius,
    effectOuterShadow: Boolean((declarations["box-shadow"] ?? "").trim()),
    fontFamily: fontFamily || "",
    fontSize,
    textColor,
    textAlign:
      textAlign === "center" || textAlign === "right" || textAlign === "justify" || textAlign === "left"
        ? textAlign
        : "",
    fontWeight: isBold && isItalic ? "boldItalic" : isBold ? "bold" : isItalic ? "italic" : "",
    opacity: Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : null,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft
  };
}

function extractCharacterStyleHints(layoutObjectXml) {
  const fontFamily = firstMatchValue(layoutObjectXml, /<Font-family\b[^>]*>([^<]+)<\/Font-family>/i).trim();
  const fontSizeRaw = firstMatchValue(layoutObjectXml, /<Font-size>([^<]+)<\/Font-size>/i).trim();
  const colorRaw = firstMatchValue(layoutObjectXml, /<Color>([^<]+)<\/Color>/i).trim();
  const faceRaw = firstMatchValue(layoutObjectXml, /<Face>([^<]+)<\/Face>/i).trim();
  const fontSize = Number.parseFloat(fontSizeRaw);
  const faceValue = Number.parseInt(faceRaw, 10);
  const isBold = Number.isFinite(faceValue) && (faceValue & 1) === 1;
  const isItalic = Number.isFinite(faceValue) && (faceValue & 2) === 2;
  return {
    fontFamily: fontFamily || "",
    fontSize: Number.isFinite(fontSize) ? fontSize : null,
    textColor: normalizeCssColorToken(colorRaw),
    fontWeight: isBold && isItalic ? "boldItalic" : isBold ? "bold" : isItalic ? "italic" : ""
  };
}

function firstMatchValue(xml, pattern, group = 1) {
  const match = xml.match(pattern);
  return match ? match[group] : "";
}

function cleanQuotedCalculation(value) {
  const collapsed = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!collapsed) {
    return "";
  }
  const quoted = collapsed.match(/^"([\s\S]*)"$/);
  if (quoted) {
    return quoted[1].replace(/""/g, "\"").trim();
  }
  return collapsed;
}

function extractTooltip(layoutObjectXml) {
  const fmsaveRaw = firstMatchValue(
    layoutObjectXml,
    /<Tooltip>[\s\S]*?<Text><!\[CDATA\[([\s\S]*?)\]\]><\/Text>[\s\S]*?<\/Tooltip>/i
  );
  if (fmsaveRaw) {
    return cleanQuotedCalculation(fmsaveRaw);
  }

  const ddrRaw = firstMatchValue(
    layoutObjectXml,
    /<ToolTip>[\s\S]*?<Calculation><!\[CDATA\[([\s\S]*?)\]\]><\/Calculation>[\s\S]*?<\/ToolTip>/i
  );
  if (ddrRaw) {
    return cleanQuotedCalculation(ddrRaw);
  }

  return "";
}

function extractPlaceholder(layoutObjectXml) {
  const fmsaveRaw = firstMatchValue(
    layoutObjectXml,
    /<Placeholder\b[\s\S]*?<Text><!\[CDATA\[([\s\S]*?)\]\]><\/Text>[\s\S]*?<\/Placeholder>/i
  );
  if (fmsaveRaw) {
    return cleanQuotedCalculation(fmsaveRaw);
  }

  const ddrRaw = firstMatchValue(
    layoutObjectXml,
    /<PlaceholderText\b[\s\S]*?<Calculation><!\[CDATA\[([\s\S]*?)\]\]><\/Calculation>[\s\S]*?<\/PlaceholderText>/i
  );
  if (ddrRaw) {
    return cleanQuotedCalculation(ddrRaw);
  }

  return "";
}

function extractTextLabel(layoutObjectXml) {
  const fmsaveStyledTextData = firstMatchValue(
    layoutObjectXml,
    /<Text>[\s\S]*?<StyledText>[\s\S]*?<Data><!\[CDATA\[([\s\S]*?)\]\]><\/Data>/i
  );
  if (fmsaveStyledTextData) {
    return fmsaveStyledTextData.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  }

  const fmsaveCalcText = firstMatchValue(
    layoutObjectXml,
    /<Text>[\s\S]*?<Calculation>[\s\S]*?<Text><!\[CDATA\[([\s\S]*?)\]\]><\/Text>/i
  );
  if (fmsaveCalcText) {
    return cleanQuotedCalculation(fmsaveCalcText);
  }

  const ddrCharacterData = firstMatchValue(
    layoutObjectXml,
    /<TextObj\b[\s\S]*?<CharacterStyleVector>[\s\S]*?<Style>[\s\S]*?<Data>([\s\S]*?)<\/Data>/i
  );
  if (ddrCharacterData) {
    const decoded = decodeXmlEntities(ddrCharacterData).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (decoded) {
      return decoded;
    }
  }

  const ddrCalculationText = firstMatchValue(
    layoutObjectXml,
    /<LabelCalc>[\s\S]*?<Calculation><!\[CDATA\[([\s\S]*?)\]\]><\/Calculation>[\s\S]*?<\/LabelCalc>/i
  );
  if (ddrCalculationText) {
    return cleanQuotedCalculation(ddrCalculationText);
  }

  return "";
}

function extractButtonLabel(layoutObjectXml) {
  const fmsaveStyledTextLabel = firstMatchValue(
    layoutObjectXml,
    /<Button>[\s\S]*?<Label>[\s\S]*?<StyledText>[\s\S]*?<Data><!\[CDATA\[([\s\S]*?)\]\]><\/Data>/i
  );
  if (fmsaveStyledTextLabel) {
    return fmsaveStyledTextLabel.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  }

  const fmsavePlainTextLabel = firstMatchValue(
    layoutObjectXml,
    /<Button>[\s\S]*?<Label>[\s\S]*?<Text>[\s\S]*?<StyledText>[\s\S]*?<Data><!\[CDATA\[([\s\S]*?)\]\]><\/Data>/i
  );
  if (fmsavePlainTextLabel) {
    return fmsavePlainTextLabel.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  }

  const fmsaveCalcLabel = firstMatchValue(
    layoutObjectXml,
    /<Button>[\s\S]*?<Label>[\s\S]*?<Calculation>[\s\S]*?<Text><!\[CDATA\[([\s\S]*?)\]\]><\/Text>/i
  );
  if (fmsaveCalcLabel) {
    return cleanQuotedCalculation(fmsaveCalcLabel);
  }

  const ddrCalcLabel = firstMatchValue(
    layoutObjectXml,
    /<LabelCalc>[\s\S]*?<Calculation><!\[CDATA\[([\s\S]*?)\]\]><\/Calculation>[\s\S]*?<\/LabelCalc>/i
  );
  if (ddrCalcLabel) {
    return cleanQuotedCalculation(ddrCalcLabel);
  }

  const ddrTextLabel = extractTextLabel(layoutObjectXml);
  if (ddrTextLabel) {
    return ddrTextLabel;
  }

  return "";
}

function extractButtonIconName(layoutObjectXml) {
  return firstMatchValue(layoutObjectXml, /<Image\b[^>]*\bname="([^"]+)"/i).trim();
}

function extractConditionalFormattingStyle(layoutObjectXml) {
  const firstItemBlock = firstMatchValue(
    layoutObjectXml,
    /<ConditionalFormatting\b[\s\S]*?<Item\b[\s\S]*?<\/Item>[\s\S]*?<\/ConditionalFormatting>/i,
    0
  );
  if (!firstItemBlock) {
    return null;
  }
  const formatBlock = firstMatchValue(firstItemBlock, /<Format\b[\s\S]*?<\/Format>/i, 0);
  if (!formatBlock) {
    return null;
  }
  const style = extractLocalCssStyles(formatBlock);
  if (!style) {
    return null;
  }
  return style;
}

function extractWebViewerUrl(layoutObjectXml) {
  const fmsaveCalc = firstMatchValue(
    layoutObjectXml,
    /<WebViewer>[\s\S]*?<Calculation>[\s\S]*?<Text><!\[CDATA\[([\s\S]*?)\]\]><\/Text>/i
  );
  if (fmsaveCalc) {
    const cleaned = cleanQuotedCalculation(fmsaveCalc);
    if (/^https?:\/\//i.test(cleaned)) {
      return cleaned;
    }
  }

  const ddrCalc = firstMatchValue(
    layoutObjectXml,
    /<WebViewerObj\b[\s\S]*?<Calculation><!\[CDATA\[([\s\S]*?)\]\]><\/Calculation>/i
  );
  if (ddrCalc) {
    const cleaned = cleanQuotedCalculation(ddrCalc);
    if (/^https?:\/\//i.test(cleaned)) {
      return cleaned;
    }
  }

  return "";
}

function extractActionCalculation(layoutObjectXml) {
  const fmsaveRaw = firstMatchValue(
    layoutObjectXml,
    /<action>[\s\S]*?<Calculation>[\s\S]*?<Text><!\[CDATA\[([\s\S]*?)\]\]><\/Text>/i
  );
  if (fmsaveRaw) {
    return cleanQuotedCalculation(fmsaveRaw);
  }

  const ddrRaw = firstMatchValue(
    layoutObjectXml,
    /<Step\b[\s\S]*?<Calculation><!\[CDATA\[([\s\S]*?)\]\]><\/Calculation>/i
  );
  if (ddrRaw) {
    return cleanQuotedCalculation(ddrRaw);
  }

  return "";
}

function extractActionScriptName(layoutObjectXml) {
  const fmsaveName = firstMatchValue(
    layoutObjectXml,
    /<action>[\s\S]*?<ScriptReference\b[^>]*name="([^"]+)"/i
  ).trim();
  if (fmsaveName) {
    return fmsaveName;
  }
  return firstMatchValue(layoutObjectXml, /<Step\b[\s\S]*?<Script\b[^>]*name="([^"]+)"/i).trim();
}

function extractActionStepName(layoutObjectXml) {
  const fmsaveName = firstMatchValue(
    layoutObjectXml,
    /<action>[\s\S]*?<Step\b[^>]*name="([^"]+)"/i
  ).trim();
  if (fmsaveName) {
    return fmsaveName;
  }
  return firstMatchValue(layoutObjectXml, /<Step\b[^>]*name="([^"]+)"/i).trim();
}

function extractActionGoToLayoutName(layoutObjectXml) {
  const fmsaveName = firstMatchValue(
    layoutObjectXml,
    /<action>[\s\S]*?<Step\b[\s\S]*?<LayoutReference\b[^>]*name="([^"]+)"/i
  ).trim();
  if (fmsaveName) {
    return fmsaveName;
  }
  return firstMatchValue(layoutObjectXml, /<Step\b[\s\S]*?<Layout\b[^>]*name="([^"]+)"/i).trim();
}

function extractButtonBarSegments(layoutObjectXml) {
  const buttonBarObjBlock = firstMatchValue(layoutObjectXml, /<ButtonBarObj\b[\s\S]*?<\/ButtonBarObj>/i, 0);
  if (!buttonBarObjBlock) {
    return [];
  }

  const objectTagName = detectLayoutObjectTagName(buttonBarObjBlock);
  const blocks = findTopLevelTagBlocks(buttonBarObjBlock, objectTagName);
  const segments = [];
  for (const block of blocks) {
    const attrs = parseAttributes(block.startTag);
    const objectType = normalizeObjectTypeToken(attrs.type ?? "");
    if (objectType !== "button") {
      continue;
    }
    const label = extractButtonLabel(block.full) || attrs.name?.trim() || "Button";
    const tooltip = extractTooltip(block.full) || undefined;
    const iconName = extractButtonIconName(block.full) || undefined;
    const onClick = extractOnClickEvent(block.full);
    segments.push({
      id: attrs.key?.trim() || attrs.id?.trim() || `segment-${segments.length + 1}`,
      label,
      tooltip,
      iconName,
      action: onClick?.action,
      script: onClick?.script,
      parameter: onClick?.parameter,
      layoutName: onClick?.layoutName
    });
  }
  return segments;
}

function extractPopoverConfig(layoutObjectXml) {
  const popoverButtonTag = firstMatchValue(layoutObjectXml, /<PopoverButtonObj\b[^>]*>/i, 0);
  const popoverButtonAttrs = popoverButtonTag ? parseAttributes(popoverButtonTag) : {};
  const displayType = String(popoverButtonAttrs.displayType ?? "").trim();
  const iconName = extractButtonIconName(layoutObjectXml);
  const nestedPopoverBlock = firstMatchValue(
    layoutObjectXml,
    /<Object\b[^>]*\btype="Popover"[\s\S]*?<\/Object>/i,
    0
  );
  const popoverTitle = nestedPopoverBlock
    ? cleanQuotedCalculation(
        firstMatchValue(
          nestedPopoverBlock,
          /<TitleCalc>[\s\S]*?<Calculation><!\[CDATA\[([\s\S]*?)\]\]><\/Calculation>[\s\S]*?<\/TitleCalc>/i
        )
      ) || "Popover"
    : "Popover";
  const popoverBounds = nestedPopoverBlock ? parseBounds(nestedPopoverBlock) : null;
  const popoverWidth = popoverBounds ? Math.max(140, roundTo(popoverBounds.right - popoverBounds.left)) : null;
  const popoverHeight = popoverBounds ? Math.max(100, roundTo(popoverBounds.bottom - popoverBounds.top)) : null;
  const popoverShowTitleBar = !/flags="-?\d*1\d*"/i.test(nestedPopoverBlock ?? "");
  const popoverButtonDisplay =
    displayType === "1"
      ? "icon"
      : displayType === "2"
        ? "textIconLeading"
        : displayType === "3"
          ? "textIconTrailing"
          : "text";
  return {
    iconName: iconName || undefined,
    popoverTitle,
    popoverWidth,
    popoverHeight,
    popoverShowTitleBar,
    popoverButtonDisplay
  };
}

function extractOnClickEvent(layoutObjectXml) {
  const stepName = extractActionStepName(layoutObjectXml).toLowerCase();
  if (stepName === "go to layout") {
    const layoutName = extractActionGoToLayoutName(layoutObjectXml);
    return {
      action: "goToLayout",
      layoutName: layoutName || undefined
    };
  }
  if (stepName === "delete portal row") {
    return {
      action: "deletePortalRow"
    };
  }

  const scriptName = extractActionScriptName(layoutObjectXml);
  if (!scriptName) {
    return undefined;
  }

  const parameter = extractActionCalculation(layoutObjectXml);
  return {
    action: "runScript",
    script: scriptName,
    parameter: parameter || undefined
  };
}

function extractValueListName(layoutObjectXml) {
  const fmsaveValueList = firstMatchValue(layoutObjectXml, /<ValueListReference\b[^>]*name="([^"]+)"/i).trim();
  if (fmsaveValueList) {
    return fmsaveValueList;
  }
  const ddrValueList = firstMatchValue(layoutObjectXml, /<FieldObj\b[\s\S]*?<ValueList>([^<]+)<\/ValueList>/i).trim();
  if (ddrValueList) {
    return decodeXmlEntities(ddrValueList).trim();
  }
  return firstMatchValue(layoutObjectXml, /<DDRInfo\b[\s\S]*?<ValueList\b[^>]*name="([^"]+)"/i).trim();
}

function extractFieldBinding(layoutObjectXml) {
  const fieldRef = layoutObjectXml.match(/<FieldReference\b[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/FieldReference>/i);
  if (fieldRef) {
    const field = decodeXmlEntities(fieldRef[1]).trim();
    const inner = fieldRef[2];
    const tableOccurrence = firstMatchValue(inner, /<TableOccurrenceReference\b[^>]*name="([^"]+)"/i).trim();
    return {
      field,
      tableOccurrence
    };
  }

  const ddrFieldNameRef = firstMatchValue(layoutObjectXml, /<FieldObj\b[\s\S]*?<Name>([^<]+)<\/Name>/i).trim();
  if (ddrFieldNameRef) {
    const decoded = decodeXmlEntities(ddrFieldNameRef);
    const split = decoded.split("::");
    if (split.length >= 2) {
      const tableOccurrence = split.shift()?.trim() ?? "";
      const field = split.join("::").trim();
      if (field) {
        return {
          field,
          tableOccurrence
        };
      }
    }
  }

  const ddrFieldName = firstMatchValue(layoutObjectXml, /<DDRInfo\b[\s\S]*?<Field\b[^>]*name="([^"]+)"/i).trim();
  const ddrTableOccurrence = firstMatchValue(
    layoutObjectXml,
    /<DDRInfo\b[\s\S]*?<Field\b[^>]*table="([^"]+)"/i
  ).trim();
  return {
    field: ddrFieldName,
    tableOccurrence: ddrTableOccurrence
  };
}

function extractStyleName(layoutObjectXml) {
  const fromFmsave = firstMatchValue(layoutObjectXml, /<LocalCSS\b[^>]*displayName="([^"]*)"/i).trim();
  if (fromFmsave) {
    return fromFmsave;
  }
  const fromDdr = firstMatchValue(layoutObjectXml, /<Styles\b[\s\S]*?<CustomStyles>[\s\S]*?<Name>([^<]*)<\/Name>/i).trim();
  return decodeXmlEntities(fromDdr);
}

function extractTabOrder(layoutObjectXml) {
  const rawValue = firstMatchValue(
    layoutObjectXml,
    /<TabOrder\b[\s\S]*?<Location\b[^>]*>([^<]+)<\/Location>/i
  ).trim();
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractFieldDisplayStyle(layoutObjectXml) {
  const fmsaveStyleValue = firstMatchValue(
    layoutObjectXml,
    /<Display\b[^>]*\bStyle="([^"]+)"/i
  ).trim();
  if (fmsaveStyleValue) {
    const parsed = Number.parseInt(fmsaveStyleValue, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const ddrStyleValue = firstMatchValue(layoutObjectXml, /<FieldObj\b[^>]*\bdisplayType="([^"]+)"/i).trim();
  const parsed = Number.parseInt(ddrStyleValue, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractFieldDisplayRepetitions(layoutObjectXml) {
  const showValue = firstMatchValue(
    layoutObjectXml,
    /<Display\b[^>]*\bshow="([^"]+)"/i
  ).trim();
  if (showValue) {
    const parsed = Number.parseInt(showValue, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  const ddrValue = firstMatchValue(layoutObjectXml, /<FieldObj\b[^>]*\bnumOfReps="([^"]+)"/i).trim();
  const parsed = Number.parseInt(ddrValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function extractFieldReferenceRepetition(layoutObjectXml) {
  const repetitionValue = firstMatchValue(
    layoutObjectXml,
    /<FieldReference\b[^>]*\brepetition="([^"]+)"/i
  ).trim();
  if (repetitionValue) {
    const parsed = Number.parseInt(repetitionValue, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  const ddrValue = firstMatchValue(layoutObjectXml, /<DDRInfo\b[\s\S]*?<Field\b[^>]*repetition="([^"]+)"/i).trim();
  const parsed = Number.parseInt(ddrValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function extractPlaceholderFindMode(layoutObjectXml) {
  return /<Placeholder\b[^>]*\bfindMode="True"/i.test(layoutObjectXml)
    || /<PlaceholderText\b[^>]*\bfindMode="True"/i.test(layoutObjectXml);
}

function extractUsageInputMode(layoutObjectXml) {
  const fmsaveMode = firstMatchValue(
    layoutObjectXml,
    /<Usage\b[^>]*\binputMode="([^"]+)"/i
  ).trim();
  const ddrMode = firstMatchValue(layoutObjectXml, /<FieldObj\b[^>]*\binputMode="([^"]+)"/i).trim();
  const mode = fmsaveMode || ddrMode;
  if (!mode) {
    return "";
  }
  if (mode === "0") {
    return "Automatic";
  }
  if (mode === "1") {
    return "ASCII";
  }
  if (mode === "2") {
    return "Native";
  }
  return `Mode ${mode}`;
}

function extractUsageType(layoutObjectXml) {
  const fmsaveType = firstMatchValue(
    layoutObjectXml,
    /<Usage\b[^>]*\btype="([^"]+)"/i
  ).trim();
  const ddrType = firstMatchValue(layoutObjectXml, /<FieldObj\b[^>]*\bkeyboardType="([^"]+)"/i).trim();
  const type = fmsaveType || ddrType;
  if (!type) {
    return "";
  }
  if (type === "0" || type === "1") {
    return "Default for Data Type";
  }
  if (type === "2") {
    return "Number Pad";
  }
  if (type === "3") {
    return "Email";
  }
  if (type === "4") {
    return "URL";
  }
  return `Type ${type}`;
}

function extractHideObjectWhenCalculation(layoutObjectXml) {
  const conditionBlocks = [...layoutObjectXml.matchAll(/<Condition\b[\s\S]*?<\/Condition>/gi)];
  for (const entry of conditionBlocks) {
    const conditionXml = entry[0];
    const rawOptions = firstMatchValue(conditionXml, /<Options\b[^>]*>([^<]*)<\/Options>/i).trim();
    const optionsValue = Number.parseInt(rawOptions, 10);
    // DDR option 5 represents "Hide object when" in this file's exported conditions.
    if (Number.isFinite(optionsValue) && optionsValue !== 5) {
      continue;
    }
    const calculation = firstMatchValue(
      conditionXml,
      /<Calculation>[\s\S]*?<Text><!\[CDATA\[([\s\S]*?)\]\]><\/Text>[\s\S]*?<\/Calculation>/i
    );
    const ddrCalculation = firstMatchValue(
      conditionXml,
      /<Calculation><!\[CDATA\[([\s\S]*?)\]\]><\/Calculation>/i
    );
    const cleaned = cleanQuotedCalculation(calculation || ddrCalculation);
    if (cleaned) {
      return cleaned;
    }
  }
  return "";
}

function extractIncludeInQuickFind(layoutObjectXml) {
  const ddrQuickFind = firstMatchValue(layoutObjectXml, /<FieldObj\b[^>]*\bquickFind="([^"]+)"/i).trim();
  if (!ddrQuickFind) {
    return undefined;
  }
  return ddrQuickFind !== "0";
}

function controlTypeFromDisplayStyle(style, objectType) {
  if (style === 6) {
    return "date";
  }
  if (style === 4) {
    return "radio";
  }
  if (style === 3) {
    return "checkbox";
  }
  if (style === 2) {
    return "popup";
  }
  if (style === 1) {
    return "dropdown";
  }
  if (style === 7) {
    return "concealed";
  }
  const normalized = objectType.toLowerCase();
  if (normalized.includes("calendar") || normalized.includes("date")) {
    return "date";
  }
  if (normalized.includes("radio")) {
    return "radio";
  }
  if (normalized.includes("checkbox")) {
    return "checkbox";
  }
  if (normalized.includes("drop-down") || normalized.includes("dropdown")) {
    return "dropdown";
  }
  if (normalized.includes("pop-up") || normalized.includes("popup")) {
    return "popup";
  }
  if (normalized.includes("concealed")) {
    return "concealed";
  }
  return "text";
}

function shapeTypeFromObjectType(objectType) {
  const normalized = objectType
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized === "line") {
    return "line";
  }
  if (normalized === "rectangle") {
    return "rectangle";
  }
  if (
    normalized === "rounded rectangle" ||
    normalized === "round rectangle"
  ) {
    return "roundedRectangle";
  }
  if (normalized === "oval" || normalized === "circle") {
    return "oval";
  }
  return "";
}

function extractPortalTableOccurrence(layoutObjectXml) {
  const fmsaveTableOccurrence = firstMatchValue(
    layoutObjectXml,
    /<Portal\b[\s\S]*?<TableOccurrenceReference\b[^>]*name="([^"]+)"/i
  ).trim();
  if (fmsaveTableOccurrence) {
    return fmsaveTableOccurrence;
  }

  const ddrAlias = firstMatchValue(layoutObjectXml, /<PortalObj\b[\s\S]*?<TableAliasKey>([^<]+)<\/TableAliasKey>/i).trim();
  if (ddrAlias) {
    return decodeXmlEntities(ddrAlias).trim();
  }

  return firstMatchValue(layoutObjectXml, /<PortalObj\b[\s\S]*?<FieldList>\s*<Field\b[^>]*table="([^"]+)"/i).trim();
}

function detectLayoutObjectTagName(xml) {
  if (/<LayoutObject\b/i.test(xml)) {
    return "LayoutObject";
  }
  if (/<Object\b/i.test(xml)) {
    return "Object";
  }
  return "LayoutObject";
}

function extractPortalRowFields(layoutObjectXml) {
  const fmsavePortalBlock = firstMatchValue(layoutObjectXml, /<Portal\b[\s\S]*?<\/Portal>/i, 0);
  const ddrPortalBlock = firstMatchValue(layoutObjectXml, /<PortalObj\b[\s\S]*?<\/PortalObj>/i, 0);
  const portalBlock = fmsavePortalBlock || ddrPortalBlock || layoutObjectXml;

  const ddrFieldList = [...portalBlock.matchAll(/<Field\b[^>]*name="([^"]+)"/gi)]
    .map((entry) => decodeXmlEntities(entry[1] ?? "").trim())
    .filter((entry) => entry.length > 0);
  if (ddrFieldList.length > 0) {
    const deduped = [];
    const seen = new Set();
    for (const name of ddrFieldList) {
      const token = name.toLowerCase();
      if (seen.has(token)) {
        continue;
      }
      seen.add(token);
      deduped.push(name);
    }
    if (deduped.length > 0) {
      return deduped;
    }
  }

  const collectedRows = [];
  const objectTagName = detectLayoutObjectTagName(portalBlock);
  function walkPortalObjects(xml, parentOffsetLeft, parentOffsetTop) {
    const objectBlocks = findTopLevelTagBlocks(xml, objectTagName);
    for (const block of objectBlocks) {
      const attrs = parseAttributes(block.startTag);
      const objectType = attrs.type?.trim() || "";
      const bounds = parseBounds(block.full);
      if (bounds.missing) {
        continue;
      }
      const absoluteLeft = parentOffsetLeft + bounds.left;
      const absoluteTop = parentOffsetTop + bounds.top;
      const binding = extractFieldBinding(block.full);
      if (binding.field) {
        collectedRows.push({
          field: binding.field,
          left: absoluteLeft,
          top: absoluteTop,
          index: collectedRows.length
        });
      }
      if (!shouldSkipChildTraversal(objectType)) {
        walkPortalObjects(block.inner, absoluteLeft, absoluteTop);
      }
    }
  }
  walkPortalObjects(portalBlock, 0, 0);

  if (collectedRows.length > 0) {
    collectedRows.sort((left, right) => {
      const verticalDelta = left.top - right.top;
      if (Math.abs(verticalDelta) > 0.5) {
        return verticalDelta;
      }
      const horizontalDelta = left.left - right.left;
      if (Math.abs(horizontalDelta) > 0.5) {
        return horizontalDelta;
      }
      return left.index - right.index;
    });

    const names = [];
    const seen = new Set();
    for (const row of collectedRows) {
      const name = row.field.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) {
        continue;
      }
      seen.add(key);
      names.push(name);
    }
    if (names.length > 0) {
      return names;
    }
  }

  const names = [];
  const seen = new Set();
  const fieldRefPattern = /<FieldReference\b[^>]*name="([^"]+)"/gi;
  let match = fieldRefPattern.exec(portalBlock);
  while (match) {
    const name = decodeXmlEntities(match[1]).trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
    match = fieldRefPattern.exec(portalBlock);
  }
  return names;
}

function extractPortalColumnSpecs(layoutObjectXml) {
  const fmsavePortalBlock = firstMatchValue(layoutObjectXml, /<Portal\b[\s\S]*?<\/Portal>/i, 0);
  const ddrPortalBlock = firstMatchValue(layoutObjectXml, /<PortalObj\b[\s\S]*?<\/PortalObj>/i, 0);
  const portalBlock = fmsavePortalBlock || ddrPortalBlock || layoutObjectXml;
  const objectTagName = detectLayoutObjectTagName(portalBlock);
  const collected = [];

  function walkPortalObjects(xml, parentOffsetLeft, parentOffsetTop) {
    const objectBlocks = findTopLevelTagBlocks(xml, objectTagName);
    for (const block of objectBlocks) {
      const attrs = parseAttributes(block.startTag);
      const objectType = normalizeObjectTypeToken(attrs.type ?? "");
      const bounds = parseBounds(block.full);
      if (bounds.missing) {
        continue;
      }
      const absoluteLeft = parentOffsetLeft + bounds.left;
      const absoluteTop = parentOffsetTop + bounds.top;
      const binding = extractFieldBinding(block.full);
      const textLabel = extractTextLabel(block.full).trim();
      if (binding.field || objectType === "text") {
        const fieldToken = binding.field.trim();
        const fallbackName = fieldToken || textLabel || attrs.name?.trim() || "";
        if (fallbackName) {
          collected.push({
            name: fallbackName,
            field: fieldToken || undefined,
            header:
              (fieldToken
                ? fieldToken
                    .replace(/[_-]+/g, " ")
                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                : textLabel || attrs.name?.trim() || fallbackName) || fallbackName,
            left: absoluteLeft,
            top: absoluteTop,
            width: Math.max(8, bounds.right - bounds.left),
            objectType,
            index: collected.length
          });
        }
      }
      if (!shouldSkipChildTraversal(attrs.type ?? "")) {
        walkPortalObjects(block.inner, absoluteLeft, absoluteTop);
      }
    }
  }

  walkPortalObjects(portalBlock, 0, 0);

  const rowFieldNames = extractPortalRowFields(layoutObjectXml);
  if (collected.length === 0) {
    return {
      headers: rowFieldNames.map((entry) => entry.trim()).filter((entry) => entry.length > 0),
      widths: rowFieldNames.map(() => 120)
    };
  }

  collected.sort((left, right) => {
    const byTop = left.top - right.top;
    if (Math.abs(byTop) > 0.5) {
      return byTop;
    }
    const byLeft = left.left - right.left;
    if (Math.abs(byLeft) > 0.5) {
      return byLeft;
    }
    return left.index - right.index;
  });

  const seen = new Set();
  const columns = [];
  const rowFieldTokenSet = new Set(rowFieldNames.map((entry) => entry.trim().toLowerCase()).filter(Boolean));
  for (const entry of collected) {
    const baseField = (entry.field ?? entry.name).trim();
    if (!baseField) {
      continue;
    }
    const key = baseField.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    if (rowFieldTokenSet.size > 0 && !rowFieldTokenSet.has(key) && entry.objectType !== "text") {
      continue;
    }
    seen.add(key);
    columns.push({
      name: baseField,
      header: entry.header.trim() || baseField,
      width: Math.max(36, roundTo(entry.width))
    });
  }

  if (columns.length === 0) {
    return {
      headers: rowFieldNames.map((entry) => entry.trim()).filter((entry) => entry.length > 0),
      widths: rowFieldNames.map(() => 120)
    };
  }

  return {
    headers: columns.map((entry) => entry.header),
    widths: columns.map((entry) => entry.width)
  };
}

function mergeStyleHints(...hints) {
  const merged = {};
  for (const hint of hints) {
    if (!hint || typeof hint !== "object") {
      continue;
    }
    for (const [key, value] of Object.entries(hint)) {
      if (value === null || value === undefined) {
        continue;
      }
      if (typeof value === "string" && value.trim().length === 0) {
        continue;
      }
      merged[key] = value;
    }
  }
  return merged;
}

function normalizeComponentBounds(absoluteBounds) {
  const width = Math.max(8, roundTo(absoluteBounds.right - absoluteBounds.left));
  const height = Math.max(8, roundTo(absoluteBounds.bottom - absoluteBounds.top));
  return {
    x: roundTo(absoluteBounds.left),
    y: roundTo(absoluteBounds.top),
    width,
    height
  };
}

function extractPortalDisplayOptions(layoutObjectXml) {
  const optionsTag = firstMatchValue(
    layoutObjectXml,
    /<Portal\b[\s\S]*?<Options\b[^>]*>/i,
    0
  );
  if (optionsTag) {
    const attrs = parseAttributes(optionsTag);
    const initialRow = Number.parseInt(attrs.index ?? "", 10);
    const rows = Number.parseInt(attrs.show ?? "", 10);
    return {
      initialRow: Number.isFinite(initialRow) && initialRow > 0 ? initialRow : 1,
      rows: Number.isFinite(rows) && rows > 0 ? rows : 6
    };
  }

  const portalObjTag = firstMatchValue(layoutObjectXml, /<PortalObj\b[^>]*>/i, 0);
  const attrs = portalObjTag ? parseAttributes(portalObjTag) : {};
  const initialRow = Number.parseInt(attrs.initialRow ?? "", 10);
  const rows = Number.parseInt(attrs.numOfRows ?? "", 10);
  return {
    initialRow: Number.isFinite(initialRow) && initialRow > 0 ? initialRow : 1,
    rows: Number.isFinite(rows) && rows > 0 ? rows : 6
  };
}

function shouldSkipChildTraversal(objectType, options = {}) {
  const normalized = objectType.toLowerCase();
  const includePortalChildren = options.includePortalChildren === true;
  return normalized === "portal" && !includePortalChildren;
}

function normalizeObjectTypeToken(objectType) {
  return objectType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGroupId(layoutId, pathSegments) {
  const tail = pathSegments.join("-");
  const safeTail = tail.replace(/[^A-Za-z0-9-]/g, "-");
  return `ddr-group-${layoutId}-${safeTail}`;
}

function isLayoutObjectGroupContainer({
  objectType,
  childCount,
  layoutObjectXml
}) {
  if (childCount <= 0) {
    return false;
  }

  const normalizedType = normalizeObjectTypeToken(objectType);
  if (!normalizedType) {
    return false;
  }

  // Explicit DDR group wrappers should always be treated as groups.
  if (
    normalizedType === "group" ||
    normalizedType === "object group" ||
    /<Group\b/i.test(layoutObjectXml) ||
    /<ObjectGroup\b/i.test(layoutObjectXml)
  ) {
    return true;
  }

  // Known container nodes are not object groups.
  const knownContainers = new Set(["portal", "tab control", "slide control", "popover"]);
  if (knownContainers.has(normalizedType)) {
    return false;
  }

  // Known renderable node types are not groups even when they contain nested data.
  const knownRenderableTypes = new Set([
    "button",
    "button bar",
    "group button",
    "popover button",
    "text",
    "field",
    "edit box",
    "drop down list",
    "drop down calendar",
    "pop up menu",
    "pop up list",
    "checkbox set",
    "radio button set",
    "container",
    "rectangle",
    "rounded rectangle",
    "round rectangle",
    "oval",
    "line",
    "web viewer",
    "chart"
  ]);
  if (knownRenderableTypes.has(normalizedType)) {
    return false;
  }

  // Heuristic fallback: unknown wrapper with children is likely a grouped-object container.
  return true;
}

function toSlug(value) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "layout";
}

function baseLayoutIdForFileMakerLayout(fileMakerLayoutName, key) {
  const slug = toSlug(fileMakerLayoutName).slice(0, 48);
  const hash = Buffer.from(key).toString("base64url").slice(0, 8);
  return `fm-${slug}-${hash}`;
}

function formatThemeName(themeToken) {
  if (!themeToken) {
    return "Universal Touch";
  }
  const tail = themeToken.includes(".") ? themeToken.split(".").pop() : themeToken;
  return tail
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeComponentId(layoutId, pathSegments) {
  const tail = pathSegments.join("-");
  const safeTail = tail.replace(/[^A-Za-z0-9-]/g, "-");
  return `ddr-${layoutId}-${safeTail}`;
}

function componentFromLayoutObject({
  layoutId,
  layoutTheme,
  pathSegments,
  objectType,
  objectName,
  objectAttrs,
  absoluteBounds,
  layoutObjectXml,
  portalContext
}) {
  const { field, tableOccurrence } = extractFieldBinding(layoutObjectXml);
  const placeholder = extractPlaceholder(layoutObjectXml);
  const tooltip = extractTooltip(layoutObjectXml);
  const styleName = extractStyleName(layoutObjectXml);
  const valueList = extractValueListName(layoutObjectXml);
  const textLabel = extractTextLabel(layoutObjectXml);
  const buttonLabel = extractButtonLabel(layoutObjectXml);
  const onClickEvent = extractOnClickEvent(layoutObjectXml);
  const webViewerUrl = extractWebViewerUrl(layoutObjectXml);
  const fieldDisplayStyle = extractFieldDisplayStyle(layoutObjectXml);
  const fieldDisplayRepetitions = extractFieldDisplayRepetitions(layoutObjectXml);
  const fieldReferenceRepetition = extractFieldReferenceRepetition(layoutObjectXml);
  const tabOrder = extractTabOrder(layoutObjectXml);
  const showPlaceholderInFindMode = extractPlaceholderFindMode(layoutObjectXml);
  const usageInputMode = extractUsageInputMode(layoutObjectXml);
  const usageType = extractUsageType(layoutObjectXml);
  const hideObjectWhen = extractHideObjectWhenCalculation(layoutObjectXml);
  const includeInQuickFind = extractIncludeInQuickFind(layoutObjectXml);
  const buttonIconName = extractButtonIconName(layoutObjectXml);
  const buttonBarSegments = extractButtonBarSegments(layoutObjectXml);
  const popoverConfig = extractPopoverConfig(layoutObjectXml);
  const localCssStyle = extractLocalCssStyles(layoutObjectXml);
  const characterStyle = extractCharacterStyleHints(layoutObjectXml);
  const conditionalFormattingStyle = extractConditionalFormattingStyle(layoutObjectXml);
  const styleHints = mergeStyleHints(localCssStyle, characterStyle, conditionalFormattingStyle);
  const ddrFidelityWarnings = [];
  if (!localCssStyle && /<LocalCSS\b/i.test(layoutObjectXml)) {
    ddrFidelityWarnings.push("LocalCSS parse failed; fallback styles applied.");
  }
  if (conditionalFormattingStyle) {
    ddrFidelityWarnings.push("Conditional formatting imported as static first-rule style.");
  }
  const scriptEvent = onClickEvent
    ? {
        onClick: onClickEvent
      }
    : undefined;

  const componentId = normalizeComponentId(layoutId, pathSegments);
  const normalizedBounds = normalizeComponentBounds(absoluteBounds);
  const normalizedType = normalizeObjectTypeToken(objectType);
  const rotation = Number.parseFloat(String(objectAttrs?.rotation ?? ""));
  const locked = String(objectAttrs?.locked ?? "").trim().toLowerCase() === "true";
  const objectFlagBits = parseObjectFlagBits(objectAttrs?.flags);
  const autosizeHints = decodeAutosizeFromObjectFlags(objectFlagBits);
  const portalParentComponentId = portalContext?.componentId?.trim() || "";
  const portalParentDdrPath = portalContext?.ddrObjectPath?.trim() || "";
  const portalParentTableOccurrence = portalContext?.tableOccurrence?.trim() || "";

  const baseComponent = {
    id: componentId,
    position: {
      x: Math.max(0, normalizedBounds.x),
      y: Math.max(0, normalizedBounds.y),
      width: normalizedBounds.width,
      height: normalizedBounds.height,
      z: 0
    },
    props: {
      tooltip: tooltip || undefined,
      hideObjectWhen: hideObjectWhen || undefined,
      styleTheme: layoutTheme || undefined,
      styleName: styleName || undefined,
      ddrObjectPath: pathSegments.join(".") || undefined,
      portalParentComponentId:
        normalizedType !== "portal" && portalParentComponentId ? portalParentComponentId : undefined,
      portalParentDdrPath:
        normalizedType !== "portal" && portalParentDdrPath ? portalParentDdrPath : undefined,
      portalParentTableOccurrence:
        normalizedType !== "portal" && portalParentTableOccurrence ? portalParentTableOccurrence : undefined,
      tabOrder,
      locked: locked || undefined,
      rotation: Number.isFinite(rotation) ? rotation : undefined,
      autosizeTop: autosizeHints.top,
      autosizeRight: autosizeHints.right,
      autosizeBottom: autosizeHints.bottom,
      autosizeLeft: autosizeHints.left,
      ddrOriginalObjectType: objectType || undefined,
      ddrObjectFlags: objectFlagBits ?? undefined,
      ddrAnchorSource: autosizeHints.source,
      ddrStyleParsed: Boolean(localCssStyle || characterStyle),
      ddrConditionalFormattingStatic: Boolean(conditionalFormattingStyle),
      ddrSourceTop: roundTo(absoluteBounds.top),
      ddrSourceLeft: roundTo(absoluteBounds.left),
      ddrSourceBottom: roundTo(absoluteBounds.bottom),
      ddrSourceRight: roundTo(absoluteBounds.right),
      ddrFidelityWarnings: ddrFidelityWarnings.length > 0 ? ddrFidelityWarnings : undefined,
      ...styleHints
    }
  };

  if (normalizedType === "button bar") {
    return {
      ...baseComponent,
      type: "button",
      props: {
        ...baseComponent.props,
        label: buttonLabel || objectName || "Button Bar",
        buttonMode: "bar",
        variant: "secondary",
        buttonBarSegments: buttonBarSegments.length > 0 ? buttonBarSegments : undefined,
        buttonIconName: buttonIconName || undefined
      },
      events: scriptEvent
    };
  }

  const shapeType = shapeTypeFromObjectType(objectType);
  if (shapeType) {
    return {
      ...baseComponent,
      type: "shape",
      props: {
        ...baseComponent.props,
        label: "",
        shapeType,
        fillType: shapeType === "line" ? "none" : styleHints.fillType || "solid",
        fillColor: shapeType === "line" ? "transparent" : styleHints.fillColor || "#ffffff",
        lineStyle: styleHints.lineStyle || "solid",
        lineWidth: Number.isFinite(styleHints.lineWidth) ? styleHints.lineWidth : shapeType === "line" ? 2 : 1,
        lineColor: styleHints.lineColor || "#94a3b8",
        cornerRadius: Number.isFinite(styleHints.cornerRadius)
          ? styleHints.cornerRadius
          : shapeType === "roundedRectangle"
            ? 12
            : 0
      },
      events: scriptEvent
    };
  }

  if (normalizedType === "portal") {
    const portalTableOccurrence = extractPortalTableOccurrence(layoutObjectXml);
    const portalRowFields = extractPortalRowFields(layoutObjectXml);
    const portalDisplayOptions = extractPortalDisplayOptions(layoutObjectXml);
    const portalColumns = extractPortalColumnSpecs(layoutObjectXml);
    return {
      ...baseComponent,
      type: "portal",
      binding: {
        tableOccurrence: portalTableOccurrence || undefined
      },
      props: {
        ...baseComponent.props,
        label: objectName || "Portal",
        portalSortRecords: false,
        portalFilterRecords: false,
        portalFilterCalculation: "",
        portalAllowDelete: false,
        portalAllowVerticalScrolling: true,
        portalScrollBar: "always",
        portalResetScrollOnExit: false,
        portalInitialRow: portalDisplayOptions.initialRow,
        repetitionsFrom: 1,
        repetitionsTo: portalDisplayOptions.rows,
        portalUseAlternateRowState: false,
        portalUseActiveRowState: true,
        portalRowFields,
        portalColumnHeaders: portalColumns.headers.length > 0 ? portalColumns.headers : undefined,
        portalColumnWidths: portalColumns.widths.length > 0 ? portalColumns.widths : undefined
      },
      events: scriptEvent
    };
  }

  const isFieldType =
    Boolean(field) ||
    normalizedType === "field" ||
    normalizedType === "edit box" ||
    normalizedType === "drop down list" ||
    normalizedType === "drop-down list" ||
    normalizedType === "drop down calendar" ||
    normalizedType === "drop-down calendar" ||
    normalizedType === "pop up menu" ||
    normalizedType === "pop-up menu" ||
    normalizedType === "pop up list" ||
    normalizedType === "pop-up list" ||
    normalizedType === "checkbox set" ||
    normalizedType === "radio button set" ||
    normalizedType === "container";

  if (normalizedType === "web viewer") {
    return {
      ...baseComponent,
      type: "webViewer",
      props: {
        ...baseComponent.props,
        label: objectName || "Web Viewer",
        webViewerUrlTemplate: webViewerUrl || "about:blank",
        buttonIconName: buttonIconName || undefined
      },
      events: scriptEvent
    };
  }

  if (normalizedType === "button" || normalizedType === "group button" || normalizedType === "popover button") {
    const label = buttonLabel || objectName || tooltip || "Button";
    const isPopoverButton = normalizedType === "popover button";
    return {
      ...baseComponent,
      type: "button",
      props: {
        ...baseComponent.props,
        label,
        variant: "secondary",
        buttonIconName: buttonIconName || undefined,
        buttonMode: isPopoverButton ? "popover" : "standard",
        popoverTitle: isPopoverButton ? popoverConfig.popoverTitle : undefined,
        popoverShowTitleBar: isPopoverButton ? popoverConfig.popoverShowTitleBar : undefined,
        popoverButtonDisplay: isPopoverButton ? popoverConfig.popoverButtonDisplay : undefined,
        popoverWidth: isPopoverButton ? popoverConfig.popoverWidth : undefined,
        popoverHeight: isPopoverButton ? popoverConfig.popoverHeight : undefined
      },
      events: scriptEvent
    };
  }

  if (normalizedType === "text") {
    const label = textLabel || objectName || "Text";
    return {
      ...baseComponent,
      type: "label",
      props: {
        ...baseComponent.props,
        label
      },
      events: scriptEvent
    };
  }

  if (isFieldType && field) {
    const isContainerObject = normalizedType === "container";
    return {
      ...baseComponent,
      type: "field",
      binding: {
        field,
        tableOccurrence: tableOccurrence || portalParentTableOccurrence || undefined
      },
      props: {
        ...baseComponent.props,
        label: "",
        labelPlacement: "none",
        placeholder: placeholder || field,
        controlType: controlTypeFromDisplayStyle(fieldDisplayStyle, objectType),
        valueList: valueList || undefined,
        showPlaceholderInFindMode,
        repetitionsFrom: fieldReferenceRepetition ?? 1,
        repetitionsTo: fieldDisplayRepetitions ?? 1,
        inputMethod: usageInputMode || undefined,
        keyboardType: usageType || undefined,
        includeInQuickFind: isContainerObject ? false : includeInQuickFind,
        containerFormat: isContainerObject ? "reduceToFit" : undefined,
        containerMaintainProportions: isContainerObject ? true : undefined,
        containerAlignHorizontal: isContainerObject ? "center" : undefined,
        containerAlignVertical: isContainerObject ? "middle" : undefined,
        containerOptimizeFor: isContainerObject ? "images" : undefined,
        textAlign:
          styleHints.textAlign === "left" ||
          styleHints.textAlign === "center" ||
          styleHints.textAlign === "right" ||
          styleHints.textAlign === "justify"
            ? styleHints.textAlign
            : undefined
      },
      events: scriptEvent
    };
  }

  const fallbackLabel = objectName ? `${objectType}: ${objectName}` : `[${objectType}]`;
  const unknownWarnings = [...ddrFidelityWarnings, `Unsupported DDR object type: ${objectType || "Unknown"}`];
  return {
    ...baseComponent,
    type: "unknown",
    props: {
      ...baseComponent.props,
      label: fallbackLabel,
      ddrFidelityWarnings: unknownWarnings
    },
    events: scriptEvent
  };
}

function collectLayoutComponents(layoutBlock, layoutId, layoutTheme) {
  const components = [];
  let arrangeOrderCounter = 1;
  const objectTagName = detectLayoutObjectTagName(layoutBlock.inner);

  function walk(xml, parentOffsetX, parentOffsetY, pathPrefix, inheritedGroupId, inheritedPortalContext) {
    const objectBlocks = findTopLevelTagBlocks(xml, objectTagName);
    for (let index = 0; index < objectBlocks.length; index += 1) {
      const block = objectBlocks[index];
      const attrs = parseAttributes(block.startTag);
      const objectType = attrs.type?.trim() || "Unknown";
      const normalizedObjectType = normalizeObjectTypeToken(objectType);
      const objectName = attrs.name?.trim() || "";
      const objectId = attrs.id?.trim() || attrs.key?.trim() || String(index + 1);
      const pathSegments = [...pathPrefix, objectId];
      const childLayoutObjects = findTopLevelTagBlocks(block.inner, objectTagName);
      const bounds = parseBounds(block.full);
      if (bounds.missing) {
        continue;
      }
      const absoluteBounds = {
        left: parentOffsetX + bounds.left,
        top: parentOffsetY + bounds.top,
        right: parentOffsetX + bounds.right,
        bottom: parentOffsetY + bounds.bottom
      };
      const groupForChildren = isLayoutObjectGroupContainer({
        objectType,
        childCount: childLayoutObjects.length,
        layoutObjectXml: block.full
      })
        ? normalizeGroupId(layoutId, pathSegments)
        : undefined;
      const suppressComponentForGroupContainer = Boolean(groupForChildren);
      const portalContextForComponent =
        normalizedObjectType === "portal" ? inheritedPortalContext : inheritedPortalContext;
      const portalContextForChildren =
        normalizedObjectType === "portal"
          ? {
              componentId: normalizeComponentId(layoutId, pathSegments),
              ddrObjectPath: pathSegments.join("."),
              tableOccurrence:
                extractPortalTableOccurrence(block.full).trim() ||
                inheritedPortalContext?.tableOccurrence?.trim() ||
                ""
            }
          : inheritedPortalContext;

      const component = suppressComponentForGroupContainer
        ? null
        : componentFromLayoutObject({
            layoutId,
            layoutTheme,
            pathSegments,
            objectType,
            objectName,
            objectAttrs: attrs,
            absoluteBounds,
            layoutObjectXml: block.full,
            portalContext: portalContextForComponent
          });
      if (component) {
        if (inheritedGroupId) {
          component.props.groupId = inheritedGroupId;
        }
        const arrangeOrder = arrangeOrderCounter;
        component.position.z = arrangeOrder;
        component.props.ddrArrangeOrder = arrangeOrder;
        arrangeOrderCounter += 1;
        components.push(component);
      }

      if (!shouldSkipChildTraversal(objectType, { includePortalChildren: true })) {
        const nextGroupId = groupForChildren || inheritedGroupId;
        walk(
          block.inner,
          absoluteBounds.left,
          absoluteBounds.top,
          pathSegments,
          nextGroupId,
          portalContextForChildren
        );
      }
    }
  }

  walk(layoutBlock.inner, 0, 0, [], undefined, undefined);
  return components;
}

function maxLayoutBounds(layoutBlock) {
  let maxRight = 0;
  let maxBottom = 0;

  const boundsPattern = /<Bounds\b[^>]*>/g;
  let match = boundsPattern.exec(layoutBlock.full);
  while (match) {
    const attrs = parseAttributes(match[0]);
    maxRight = Math.max(maxRight, numberOr(attrs.right, 0));
    maxBottom = Math.max(maxBottom, numberOr(attrs.bottom, 0));
    match = boundsPattern.exec(layoutBlock.full);
  }

  const partDefPattern = /<Definition\b[^>]*size="([^"]+)"[^>]*absolute="([^"]+)"/g;
  let part = partDefPattern.exec(layoutBlock.full);
  while (part) {
    maxBottom = Math.max(maxBottom, numberOr(part[1], 0) + numberOr(part[2], 0));
    part = partDefPattern.exec(layoutBlock.full);
  }

  return { maxRight, maxBottom };
}

function normalizePartType(partTypeToken) {
  const normalized = partTypeToken
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "";
  }
  if (normalized === "top navigation") {
    return "topNavigation";
  }
  if (normalized === "title header") {
    return "titleHeader";
  }
  if (normalized === "header") {
    return "header";
  }
  if (normalized === "leading grand summary") {
    return "leadingGrandSummary";
  }
  if (normalized.startsWith("sub summary")) {
    return "subSummary";
  }
  if (normalized === "body") {
    return "body";
  }
  if (normalized === "trailing grand summary") {
    return "trailingGrandSummary";
  }
  if (normalized === "footer") {
    return "footer";
  }
  if (normalized === "title footer") {
    return "titleFooter";
  }
  if (normalized === "bottom navigation") {
    return "bottomNavigation";
  }
  return "";
}

function defaultPartLabel(partType, sortByField) {
  if (partType === "topNavigation") {
    return "Top Navigation";
  }
  if (partType === "titleHeader") {
    return "Title Header";
  }
  if (partType === "header") {
    return "Header";
  }
  if (partType === "leadingGrandSummary") {
    return "Leading Grand Summary";
  }
  if (partType === "subSummary") {
    return sortByField ? `Sub-summary (${sortByField})` : "Sub-summary";
  }
  if (partType === "body") {
    return "Body";
  }
  if (partType === "trailingGrandSummary") {
    return "Trailing Grand Summary";
  }
  if (partType === "footer") {
    return "Footer";
  }
  if (partType === "titleFooter") {
    return "Title Footer";
  }
  if (partType === "bottomNavigation") {
    return "Bottom Navigation";
  }
  return "Part";
}

function extractLayoutParts(layoutBlock, layoutId) {
  const partsListBlock = firstMatchValue(layoutBlock.full, /<PartsList\b[\s\S]*?<\/PartsList>/i, 0);
  if (!partsListBlock) {
    return [];
  }

  const partBlocks = findTopLevelTagBlocks(partsListBlock, "Part");
  if (partBlocks.length === 0) {
    return [];
  }

  const extracted = [];
  for (let index = 0; index < partBlocks.length; index += 1) {
    const partBlock = partBlocks[index];
    const partAttrs = parseAttributes(partBlock.startTag);
    const partTypeToken = (partAttrs.type ?? "").trim();
    const partType = normalizePartType(partTypeToken);
    if (!partType) {
      continue;
    }

    const definitionTag = firstMatchValue(partBlock.full, /<Definition\b[^>]*>/i, 0);
    const definitionAttrs = definitionTag ? parseAttributes(definitionTag) : {};
    const height = Math.max(20, Math.round(numberOr(definitionAttrs.size, 20)));
    const absolute = Math.max(0, Math.round(numberOr(definitionAttrs.absolute, index * 20)));
    const sortByField = firstMatchValue(
      partBlock.full,
      /<Definition\b[\s\S]*?<FieldReference\b[^>]*name="([^"]+)"/i
    ).trim();

    extracted.push({
      absolute,
      index,
      part: {
        id: `ddr-part-${layoutId}-${index + 1}`,
        type: partType,
        label: defaultPartLabel(partType, sortByField),
        height,
        sortByField: partType === "subSummary" ? (sortByField || undefined) : undefined,
        pageBreakBeforeEachOccurrence: false,
        pageBreakAfterEveryOccurrences: null,
        restartPageNumbersAfterEachOccurrence: false,
        allowPartToBreakAcrossPageBoundaries: false,
        discardRemainderBeforeNewPage: false,
        useAlternateRowState: false,
        useActiveRowState: partType === "body"
      }
    });
  }

  return extracted
    .sort((left, right) => {
      if (left.absolute !== right.absolute) {
        return left.absolute - right.absolute;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.part);
}

export function extractLayoutCatalogSummary(xml) {
  const catalogBlock = firstMatchValue(xml, /<LayoutCatalog\b[\s\S]*?<\/LayoutCatalog>/i, 0);
  if (!catalogBlock) {
    return [];
  }
  const layoutBlocks = findTopLevelTagBlocks(catalogBlock, "Layout");
  const summary = [];
  for (const layoutBlock of layoutBlocks) {
    const attrs = parseAttributes(layoutBlock.startTag);
    const layoutName = String(attrs.name ?? "").trim();
    const isFolder = attrs.isFolder === "True";
    const isSeparatorLikeName = /^-+$/.test(layoutName.replace(/\s+/g, ""));
    const isSeparatorItem = attrs.isSeparatorItem === "True" || isSeparatorLikeName;
    if (!layoutName || isFolder || isSeparatorItem) {
      continue;
    }
    const objectTagName = detectLayoutObjectTagName(layoutBlock.inner);
    const objectTypeCounts = {};
    const objectPattern = new RegExp(`<${objectTagName}\\b[^>]*\\btype="([^"]+)"[^>]*>`, "gi");
    let objectMatch = objectPattern.exec(layoutBlock.inner);
    while (objectMatch) {
      const normalizedType = normalizeObjectTypeToken(decodeXmlEntities(objectMatch[1] ?? "").trim() || "unknown");
      if (normalizedType) {
        objectTypeCounts[normalizedType] = (objectTypeCounts[normalizedType] ?? 0) + 1;
      }
      objectMatch = objectPattern.exec(layoutBlock.inner);
    }
    summary.push({
      name: layoutName,
      id: attrs.id?.trim() || "",
      objectCount: Object.values(objectTypeCounts).reduce((sum, value) => sum + Number(value || 0), 0),
      objectTypeCounts
    });
  }
  return summary;
}

export function inferDatabaseScope(xml) {
  const saveAsXmlFile = firstMatchValue(xml, /<FMSaveAsXML\b[^>]*\bFile="([^"]+)"/i).trim();
  if (saveAsXmlFile) {
    return saveAsXmlFile.replace(/\.fmp12$/i, "").trim() || "default";
  }
  const ddrFile = firstMatchValue(xml, /<File\b[^>]*\bname="([^"]+)"/i).trim();
  if (ddrFile) {
    return ddrFile.replace(/\.fmp12$/i, "").trim() || "default";
  }
  return "default";
}

export function inferSourceFileName(xml) {
  const saveAsXmlFile = firstMatchValue(xml, /<FMSaveAsXML\b[^>]*\bFile="([^"]+)"/i).trim();
  if (saveAsXmlFile) {
    return saveAsXmlFile;
  }
  return firstMatchValue(xml, /<File\b[^>]*\bname="([^"]+)"/i).trim();
}

export function readAsXml(rawBuffer) {
  const utf16Candidate = rawBuffer.toString("utf16le");
  if (utf16Candidate.includes("<FMSaveAsXML") || utf16Candidate.includes("<FMPReport")) {
    return utf16Candidate.charCodeAt(0) === 0xfeff ? utf16Candidate.slice(1) : utf16Candidate;
  }
  const utf8Candidate = rawBuffer.toString("utf8");
  return utf8Candidate.charCodeAt(0) === 0xfeff ? utf8Candidate.slice(1) : utf8Candidate;
}

async function detectXmlEncodingFromFile(filePath) {
  const handle = await fs.open(filePath, "r");
  try {
    const probe = Buffer.alloc(4096);
    const { bytesRead } = await handle.read(probe, 0, probe.length, 0);
    const sample = probe.subarray(0, bytesRead);
    if (sample.length >= 2) {
      const bom16le = sample[0] === 0xff && sample[1] === 0xfe;
      if (bom16le) {
        return "utf16le";
      }
      const bom16be = sample[0] === 0xfe && sample[1] === 0xff;
      if (bom16be) {
        // FileMaker DDR exports in UTF-16 LE/UTF-8 in our fixtures.
        // Treat BE as UTF-8 fallback rather than failing hard.
        return "utf8";
      }
    }
    const zeroByteCount = [...sample].filter((value, index) => index % 2 === 1 && value === 0).length;
    if (sample.length > 32 && zeroByteCount > sample.length * 0.18) {
      return "utf16le";
    }
    return "utf8";
  } finally {
    await handle.close();
  }
}

async function readDdrCatalogStreaming(filePath) {
  const encoding = await detectXmlEncodingFromFile(filePath);
  const stream = createReadStream(filePath, {
    encoding,
    highWaterMark: 256 * 1024
  });
  const startPattern = /<LayoutCatalog\b[^>]*>/i;
  const endToken = "</LayoutCatalog>";
  const endTokenLower = endToken.toLowerCase();
  const metadataLimit = 1_500_000;

  let metadataText = "";
  let carry = "";
  let collectingCatalog = false;
  let catalogXml = "";

  for await (const rawChunk of stream) {
    const chunk = String(rawChunk ?? "");
    if (!collectingCatalog) {
      const combined = `${carry}${chunk}`;
      const startIndex = combined.search(startPattern);
      if (startIndex < 0) {
        if (metadataText.length < metadataLimit) {
          const remaining = metadataLimit - metadataText.length;
          metadataText += combined.slice(0, remaining);
        }
        carry = combined.slice(-512);
        continue;
      }

      collectingCatalog = true;
      const beforeCatalog = combined.slice(0, startIndex);
      if (metadataText.length < metadataLimit && beforeCatalog.length > 0) {
        const remaining = metadataLimit - metadataText.length;
        metadataText += beforeCatalog.slice(0, remaining);
      }
      catalogXml = combined.slice(startIndex);
      carry = "";
    } else {
      catalogXml += chunk;
    }

    const endIndex = catalogXml.toLowerCase().indexOf(endTokenLower);
    if (endIndex >= 0) {
      catalogXml = catalogXml.slice(0, endIndex + endToken.length);
      break;
    }
  }

  if (!catalogXml) {
    throw new Error("Unable to find <LayoutCatalog> while streaming DDR XML");
  }

  const metadataXml = `${metadataText}\n${catalogXml}`;
  return {
    catalogXml,
    metadataXml
  };
}

function normalizeWorkspaceId(value) {
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "default";
}

export function normalizeDatabaseToken(value) {
  return String(value ?? "")
    .trim()
    .replace(/\.fmp12$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeHostHint(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const cleaned = raw.replace(/^["']|["']$/g, "").trim();
  if (!cleaned) {
    return "";
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned.replace(/\/+$/, "");
  }

  const fmProtocol = cleaned.match(/^(?:fmnet|fmp):\/+([^/\s?#:]+(?::\d+)?)/i);
  if (fmProtocol) {
    return `https://${fmProtocol[1]}`;
  }

  const token = cleaned.split(/[/?#]/)[0].trim();
  if (!token || /^[a-z]:$/i.test(token)) {
    return "";
  }

  if (token === "localhost" || /^[\w.-]+\.[a-z]{2,}$/i.test(token) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(token)) {
    return `https://${token}`;
  }

  return "";
}

export function extractHostHintFromXml(xml) {
  const candidates = [
    firstMatchValue(xml, /<FMPReport\b[^>]*\bpath="([^"]+)"/i),
    firstMatchValue(xml, /<File\b[^>]*\bpath="([^"]+)"/i),
    firstMatchValue(xml, /<FileReference\b[^>]*\bpath="([^"]+)"/i)
  ];

  for (const candidate of candidates) {
    const host = normalizeHostHint(candidate);
    if (host) {
      return host;
    }
  }

  return "";
}

export function parseSummaryFileEntries(summaryXml, summaryPath, workspacePrefix) {
  const summaryDir = path.dirname(summaryPath);
  const fileTagPattern = /<File\b[^>]*>/gi;
  const entries = [];
  const seenByPath = new Set();

  let match = fileTagPattern.exec(summaryXml);
  while (match) {
    const attrs = parseAttributes(match[0]);
    const linkToken = String(attrs.link ?? "").trim();
    const fileName = String(attrs.name ?? "").trim();
    if (!linkToken && !fileName) {
      match = fileTagPattern.exec(summaryXml);
      continue;
    }

    const cleanedLink = linkToken.replace(/^\.\/+/, "").replace(/^\/+/, "");
    const fallbackName = fileName ? fileName.replace(/\.fmp12$/i, "_fmp12.xml") : "";
    const relativeCandidate = cleanedLink || fallbackName;
    if (!relativeCandidate) {
      match = fileTagPattern.exec(summaryXml);
      continue;
    }

    const resolvedPath = path.resolve(summaryDir, relativeCandidate);
    const normalizedPath = path.normalize(resolvedPath);
    if (seenByPath.has(normalizedPath)) {
      match = fileTagPattern.exec(summaryXml);
      continue;
    }
    seenByPath.add(normalizedPath);

    const databaseName = fileName.replace(/\.fmp12$/i, "").trim() || path.basename(relativeCandidate).replace(/_fmp12\.xml$/i, "");
    const baseWorkspaceId = normalizeWorkspaceId(databaseName);
    const workspaceId = workspacePrefix
      ? normalizeWorkspaceId(`${workspacePrefix}-${baseWorkspaceId}`)
      : baseWorkspaceId;

    entries.push({
      ddrPath: normalizedPath,
      fileName,
      databaseName,
      workspaceId,
      hostHint: normalizeHostHint(attrs.path)
    });

    match = fileTagPattern.exec(summaryXml);
  }

  return entries;
}

function extractFileReferenceNames(xml) {
  const names = [];
  const seen = new Set();
  const pattern = /<FileReference\b[^>]*\bname="([^"]+)"/gi;
  let match = pattern.exec(xml);
  while (match) {
    const name = decodeXmlEntities(match[1] ?? "").trim();
    const token = normalizeDatabaseToken(name);
    if (!name || !token || seen.has(token)) {
      match = pattern.exec(xml);
      continue;
    }
    seen.add(token);
    names.push(name);
    match = pattern.exec(xml);
  }
  return names;
}

function resolveDependencyWorkspaceIds({
  fileReferenceNames,
  workspaceByDatabaseToken,
  currentWorkspaceId
}) {
  const deps = [];
  const seen = new Set();
  for (const name of fileReferenceNames) {
    const token = normalizeDatabaseToken(name);
    if (!token) {
      continue;
    }
    const workspaceId = workspaceByDatabaseToken[token];
    if (!workspaceId || workspaceId === currentWorkspaceId || seen.has(workspaceId)) {
      continue;
    }
    seen.add(workspaceId);
    deps.push(workspaceId);
  }
  return deps;
}

export function parseCliArgs(argv) {
  const args = [...argv];
  let ddrPath = "";
  let workspaceId = process.env.WORKSPACE_ID || "default";
  let summaryPath = process.env.DDR_SUMMARY_PATH || "";
  let workspacePrefix = process.env.WORKSPACE_PREFIX || "";

  while (args.length > 0) {
    const token = String(args.shift() ?? "");
    if (!token) {
      continue;
    }
    if (token === "--workspace" || token === "-w") {
      const next = String(args.shift() ?? "").trim();
      if (next) {
        workspaceId = next;
      }
      continue;
    }
    if (token.startsWith("--workspace=")) {
      const raw = token.slice("--workspace=".length).trim();
      if (raw) {
        workspaceId = raw;
      }
      continue;
    }
    if (token === "--summary" || token === "-s") {
      const next = String(args.shift() ?? "").trim();
      if (next) {
        summaryPath = next;
      }
      continue;
    }
    if (token.startsWith("--summary=")) {
      const raw = token.slice("--summary=".length).trim();
      if (raw) {
        summaryPath = raw;
      }
      continue;
    }
    if (token === "--workspace-prefix") {
      const next = String(args.shift() ?? "").trim();
      if (next) {
        workspacePrefix = next;
      }
      continue;
    }
    if (token.startsWith("--workspace-prefix=")) {
      const raw = token.slice("--workspace-prefix=".length).trim();
      if (raw) {
        workspacePrefix = raw;
      }
      continue;
    }
    if (!token.startsWith("-") && !ddrPath) {
      if (/summary\.xml$/i.test(token)) {
        summaryPath = token;
      } else {
        ddrPath = token;
      }
    }
  }

  return {
    ddrPath: ddrPath || process.env.DDR_PATH || DEFAULT_DDR_PATH,
    workspaceId: normalizeWorkspaceId(workspaceId),
    summaryPath: summaryPath.trim(),
    workspacePrefix: workspacePrefix.trim()
  };
}

export async function importDdrToWorkspace({
  cwd,
  ddrPath,
  workspaceId,
  summaryPath,
  solutionName,
  workspaceByDatabaseToken,
  hostHint
}) {
  const workspaceRoot =
    workspaceId === "default"
      ? path.join(cwd, "data")
      : path.join(cwd, "data", "workspaces", workspaceId);
  const layoutsDir = workspaceId === "default" ? path.join(cwd, "data", "layouts") : path.join(workspaceRoot, "layouts");
  const layoutMapPath =
    workspaceId === "default"
      ? path.join(cwd, "data", "layout-fm-map.json")
      : path.join(workspaceRoot, "layout-fm-map.json");
  const workspaceConfigPath = path.join(cwd, "data", "workspaces", workspaceId, "workspace.json");

  const { catalogXml, metadataXml } = await readDdrCatalogStreaming(ddrPath);
  const layoutBlocks = findTopLevelTagBlocks(catalogXml, "Layout");
  if (layoutBlocks.length === 0) {
    throw new Error("No <Layout> blocks found in DDR XML");
  }

  const inferredScope = process.env.FILEMAKER_DATABASE?.trim() || inferDatabaseScope(metadataXml);
  const sourceFileName = inferSourceFileName(metadataXml);
  const inferredHostHint = normalizeHostHint(hostHint) || extractHostHintFromXml(metadataXml);
  const fileReferenceNames = extractFileReferenceNames(metadataXml);
  const dependencyWorkspaceIds = resolveDependencyWorkspaceIds({
    fileReferenceNames,
    workspaceByDatabaseToken: workspaceByDatabaseToken ?? {},
    currentWorkspaceId: workspaceId
  });
  const scopePrefix = `${inferredScope}::`;
  const importedLayoutNames = [];

  await fs.mkdir(layoutsDir, { recursive: true });
  await fs.mkdir(path.dirname(workspaceConfigPath), { recursive: true });

  let existingMap = {
    version: 1,
    byFileMakerLayoutKey: {}
  };
  try {
    const rawMap = await fs.readFile(layoutMapPath, "utf8");
    const parsedMap = JSON.parse(rawMap);
    if (parsedMap && parsedMap.version === 1 && parsedMap.byFileMakerLayoutKey) {
      existingMap = parsedMap;
    }
  } catch {
    // Start with a new map if none exists.
  }

  const previousEntries = existingMap.byFileMakerLayoutKey;
  const previousScopeEntries = {};
  const preservedOtherScopes = {};
  for (const [key, value] of Object.entries(previousEntries)) {
    if (!key.startsWith(scopePrefix)) {
      preservedOtherScopes[key] = value;
    } else {
      previousScopeEntries[key] = value;
    }
  }

  const nextScopeEntries = {};

  for (const layoutBlock of layoutBlocks) {
    const attrs = parseAttributes(layoutBlock.startTag);
    const layoutName = (attrs.name || "").trim();
    const isFolder = attrs.isFolder === "True";
    const isSeparatorLikeName = /^-+$/.test(layoutName.replace(/\s+/g, ""));
    const isSeparatorItem = attrs.isSeparatorItem === "True" || isSeparatorLikeName;

    if (!layoutName || isFolder || isSeparatorItem) {
      continue;
    }

    const mapKey = `${inferredScope}::${layoutName}`;
    const mappedId =
      previousEntries[mapKey] || baseLayoutIdForFileMakerLayout(layoutName, mapKey);
    const layoutThemeToken = firstMatchValue(
      layoutBlock.full,
      /<LayoutThemeReference\b[^>]*name="([^"]+)"/i
    ).trim() || firstMatchValue(layoutBlock.full, /<Theme\b[^>]*name="([^"]+)"/i).trim();
    const layoutTheme = formatThemeName(layoutThemeToken);
    const components = collectLayoutComponents(layoutBlock, mappedId, layoutTheme);
    const parts = extractLayoutParts(layoutBlock, mappedId);
    const { maxRight, maxBottom } = maxLayoutBounds(layoutBlock);
    const widthHint = numberOr(attrs.width, 0);
    const canvasWidth = Math.max(480, Math.round(Math.max(widthHint, maxRight + 24)));
    const partsHeight = parts.reduce((sum, part) => sum + Math.max(20, Math.round(numberOr(part.height, 20))), 0);
    const canvasHeight = Math.max(600, Math.round(Math.max(maxBottom + 40, partsHeight + 24)));

    const layoutPayload = {
      id: mappedId,
      name: layoutName,
      // This project uses defaultTableOccurrence as the Data API layout selector.
      // Keep this as the FM layout name so /layouts/{name} endpoints work.
      defaultTableOccurrence: layoutName,
      canvas: {
        width: canvasWidth,
        height: canvasHeight,
        gridSize: 8,
        showGrid: false,
        snapToGrid: false
      },
      parts: parts.length > 0 ? parts : undefined,
      components,
      actions: []
    };

    await fs.writeFile(
      path.join(layoutsDir, `${mappedId}.json`),
      JSON.stringify(layoutPayload, null, 2),
      "utf8"
    );

    nextScopeEntries[mapKey] = mappedId;
    importedLayoutNames.push(layoutName);
  }

  const nextMap = {
    version: 1,
    byFileMakerLayoutKey: {
      ...preservedOtherScopes,
      ...nextScopeEntries
    }
  };

  await fs.writeFile(layoutMapPath, JSON.stringify(nextMap, null, 2), "utf8");
  let existingWorkspaceConfig = null;
  try {
    existingWorkspaceConfig = JSON.parse(await fs.readFile(workspaceConfigPath, "utf8"));
  } catch {
    existingWorkspaceConfig = null;
  }
  const existingFilemaker =
    existingWorkspaceConfig && typeof existingWorkspaceConfig.filemaker === "object"
      ? existingWorkspaceConfig.filemaker
      : {};

  await fs.writeFile(
    workspaceConfigPath,
    JSON.stringify(
      {
        version: 1,
        id: workspaceId,
        name:
          (typeof existingWorkspaceConfig?.name === "string" && existingWorkspaceConfig.name.trim()) ||
          inferredScope ||
          workspaceId,
        filemaker: {
          host:
            (typeof existingFilemaker.host === "string" && existingFilemaker.host.trim()) ||
            inferredHostHint ||
            undefined,
          database: inferredScope || undefined,
          username:
            (typeof existingFilemaker.username === "string" && existingFilemaker.username.trim()) || undefined,
          password:
            (typeof existingFilemaker.password === "string" && existingFilemaker.password.trim()) || undefined,
          ddrPath,
          summaryPath: summaryPath || undefined,
          sourceFileName: sourceFileName || undefined,
          solutionName: solutionName || undefined,
          dependsOn: dependencyWorkspaceIds.length > 0 ? dependencyWorkspaceIds : undefined,
          externalDataSources: fileReferenceNames.length > 0 ? fileReferenceNames : undefined
        }
      },
      null,
      2
    ),
    "utf8"
  );

  const nextMappedIds = new Set(Object.values(nextScopeEntries));
  const usedByOtherScopes = new Set(Object.values(preservedOtherScopes));
  for (const staleId of Object.values(previousScopeEntries)) {
    if (nextMappedIds.has(staleId) || usedByOtherScopes.has(staleId)) {
      continue;
    }
    if (!staleId.startsWith("fm-")) {
      continue;
    }
    const stalePath = path.join(layoutsDir, `${staleId}.json`);
    try {
      await fs.unlink(stalePath);
    } catch {
      // Ignore stale files that no longer exist.
    }
  }

  const allMappedIds = new Set(Object.values(nextMap.byFileMakerLayoutKey));
  const layoutFiles = await fs.readdir(layoutsDir);
  for (const fileName of layoutFiles) {
    if (!fileName.endsWith(".json")) {
      continue;
    }
    if (!fileName.startsWith("fm-")) {
      continue;
    }
    const id = fileName.slice(0, -5);
    if (allMappedIds.has(id)) {
      continue;
    }
    try {
      await fs.unlink(path.join(layoutsDir, fileName));
    } catch {
      // Ignore files that can no longer be removed.
    }
  }

  importedLayoutNames.sort((a, b) => a.localeCompare(b));
  return {
    workspaceId,
    database: inferredScope,
    sourceFileName,
    importedLayoutNames
  };
}

async function main() {
  const cwd = process.cwd();
  const args = parseCliArgs(process.argv.slice(2));

  if (args.summaryPath) {
    const rawSummary = await fs.readFile(args.summaryPath);
    const summaryXml = readAsXml(rawSummary);
    const solutionName = path.basename(path.dirname(args.summaryPath)) || "FileMaker Solution";
    const summaryEntries = parseSummaryFileEntries(summaryXml, args.summaryPath, args.workspacePrefix);
    if (summaryEntries.length === 0) {
      throw new Error("No DDR files were found in Summary.xml");
    }

    const workspaceByDatabaseToken = {};
    for (const entry of summaryEntries) {
      if (entry.databaseName) {
        workspaceByDatabaseToken[normalizeDatabaseToken(entry.databaseName)] = entry.workspaceId;
      }
      if (entry.fileName) {
        workspaceByDatabaseToken[normalizeDatabaseToken(entry.fileName)] = entry.workspaceId;
      }
    }

    const results = [];
    for (const entry of summaryEntries) {
      const result = await importDdrToWorkspace({
        cwd,
        ddrPath: entry.ddrPath,
        workspaceId: entry.workspaceId,
        summaryPath: args.summaryPath,
        solutionName,
        workspaceByDatabaseToken,
        hostHint: entry.hostHint
      });
      results.push(result);
    }

    let totalLayouts = 0;
    for (const result of results) {
      totalLayouts += result.importedLayoutNames.length;
      console.log(`Imported ${result.importedLayoutNames.length} layout(s) from DDR.`);
      console.log(`Workspace: ${result.workspaceId}`);
      console.log(`Database scope: ${result.database}`);
    }
    console.log(`Solution import complete: ${results.length} workspace(s), ${totalLayouts} total layout(s).`);
    return;
  }

  const result = await importDdrToWorkspace({
    cwd,
    ddrPath: args.ddrPath,
    workspaceId: args.workspaceId,
    summaryPath: "",
    solutionName: "",
    workspaceByDatabaseToken: {},
    hostHint: ""
  });

  const importedLayoutNames = result.importedLayoutNames;
  console.log(`Imported ${importedLayoutNames.length} layout(s) from DDR.`);
  console.log(`Workspace: ${result.workspaceId}`);
  console.log(`Database scope: ${result.database}`);
  for (const name of importedLayoutNames) {
    console.log(`- ${name}`);
  }
}

const isCliInvocation =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCliInvocation) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
