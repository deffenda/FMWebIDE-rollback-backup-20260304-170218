export type FMCalcEvaluationContext = {
  currentRecord?: Record<string, unknown> | null;
  currentTableOccurrence?: string;
  relatedRecord?: Record<string, unknown> | null;
  relatedTableOccurrence?: string;
  variables?: Record<string, unknown>;
  currentLayoutName?: string;
  currentAccountName?: string;
  now?: Date | string | number;
};

export type FMCalcEvaluationResult<T = unknown> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      value: null;
      error: string;
    };

type TokenType =
  | "number"
  | "string"
  | "identifier"
  | "boolean"
  | "operator"
  | "lparen"
  | "rparen"
  | "separator"
  | "concat"
  | "eof";

type Token = {
  type: TokenType;
  value: string;
  index: number;
};

type BinaryOperator = "&" | "=" | "!=" | "<" | "<=" | ">" | ">=" | "and" | "or";
type UnaryOperator = "not";

type AstNode =
  | {
      kind: "literal";
      value: string | number | boolean;
    }
  | {
      kind: "field";
      name: string;
    }
  | {
      kind: "binary";
      op: BinaryOperator;
      left: AstNode;
      right: AstNode;
    }
  | {
      kind: "unary";
      op: UnaryOperator;
      expression: AstNode;
    }
  | {
      kind: "call";
      name: string;
      args: AstNode[];
    };

type ParsedExpressionCacheEntry = {
  ast: AstNode;
  dependencies: string[];
  volatile: boolean;
};

type EvaluationCacheEntry = {
  value: unknown;
  expiresAt: number;
};

const PARSED_EXPRESSION_CACHE_LIMIT = 512;
const EVALUATION_CACHE_LIMIT = 2_048;
const EVALUATION_CACHE_TTL_MS = 750;
const parsedExpressionCache = new Map<string, ParsedExpressionCacheEntry>();
const evaluationCache = new Map<string, EvaluationCacheEntry>();

function setWithCap<T>(map: Map<string, T>, key: string, value: T, limit: number): void {
  if (map.has(key)) {
    map.delete(key);
  }
  map.set(key, value);
  if (map.size <= limit) {
    return;
  }
  const oldestKey = map.keys().next().value as string | undefined;
  if (oldestKey) {
    map.delete(oldestKey);
  }
}

class FMCalcError extends Error {
  readonly index: number;

  constructor(message: string, index = -1) {
    super(message);
    this.name = "FMCalcError";
    this.index = index;
  }
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierChar(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function normalizeOperator(raw: string): BinaryOperator {
  if (raw === "&") {
    return "&";
  }
  if (raw === "=" || raw === "==") {
    return "=";
  }
  if (raw === "!=" || raw === "<>" || raw === "≠") {
    return "!=";
  }
  if (raw === "<") {
    return "<";
  }
  if (raw === "<=" || raw === "≤") {
    return "<=";
  }
  if (raw === ">") {
    return ">";
  }
  if (raw === ">=" || raw === "≥") {
    return ">=";
  }
  if (raw.toLowerCase() === "and") {
    return "and";
  }
  return "or";
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index] ?? "";
    if (isWhitespace(char)) {
      index += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "lparen", value: char, index });
      index += 1;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "rparen", value: char, index });
      index += 1;
      continue;
    }
    if (char === ";" || char === ",") {
      tokens.push({ type: "separator", value: char, index });
      index += 1;
      continue;
    }
    if (char === "&") {
      tokens.push({ type: "concat", value: "&", index });
      index += 1;
      continue;
    }

    const threeChar = expression.slice(index, index + 3);
    const twoChar = expression.slice(index, index + 2);
    if (["<=", ">=", "<>", "!=", "=="].includes(twoChar) || ["≤", "≥", "≠"].includes(char)) {
      const value = ["≤", "≥", "≠"].includes(char) ? char : twoChar;
      tokens.push({ type: "operator", value, index });
      index += value.length;
      continue;
    }
    if (char === "<" || char === ">" || char === "=") {
      tokens.push({ type: "operator", value: char, index });
      index += 1;
      continue;
    }

    if (char === "\"") {
      let value = "";
      let cursor = index + 1;
      while (cursor < expression.length) {
        const current = expression[cursor] ?? "";
        const next = expression[cursor + 1] ?? "";
        if (current === "\\" && next) {
          value += next;
          cursor += 2;
          continue;
        }
        if (current === "\"" && next === "\"") {
          value += "\"";
          cursor += 2;
          continue;
        }
        if (current === "\"") {
          break;
        }
        value += current;
        cursor += 1;
      }
      if (cursor >= expression.length || expression[cursor] !== "\"") {
        throw new FMCalcError("Unterminated string literal", index);
      }
      tokens.push({ type: "string", value, index });
      index = cursor + 1;
      continue;
    }

    const nextChar = expression[index + 1] ?? "";
    if (isDigit(char) || (char === "." && isDigit(nextChar))) {
      let cursor = index + 1;
      while (cursor < expression.length) {
        const current = expression[cursor] ?? "";
        if (!isDigit(current) && current !== ".") {
          break;
        }
        cursor += 1;
      }
      const value = expression.slice(index, cursor);
      tokens.push({ type: "number", value, index });
      index = cursor;
      continue;
    }

    if (isIdentifierStart(char)) {
      let cursor = index;
      let value = "";
      let hasQualifiedSeparator = false;
      while (cursor < expression.length) {
        const current = expression[cursor] ?? "";
        if (current === ":" && expression[cursor + 1] === ":") {
          hasQualifiedSeparator = true;
          value += "::";
          cursor += 2;
          continue;
        }
        if (current === "(" || current === ")" || current === ";" || current === "," || current === "&") {
          break;
        }
        if (current === "<" || current === ">" || current === "=" || current === "!") {
          break;
        }
        if (isWhitespace(current)) {
          const remainder = expression.slice(cursor).trimStart();
          const nextToken = remainder.split(/[\s();,&<>!=]/)[0]?.toLowerCase() ?? "";
          if (!hasQualifiedSeparator) {
            break;
          }
          if (nextToken === "and" || nextToken === "or" || nextToken === "not") {
            break;
          }
          value += " ";
          cursor += 1;
          while (cursor < expression.length && isWhitespace(expression[cursor] ?? "")) {
            cursor += 1;
          }
          continue;
        }
        value += current;
        cursor += 1;
      }
      const normalized = value.trim();
      if (!normalized) {
        throw new FMCalcError("Unexpected token", index);
      }
      const lowered = normalized.toLowerCase();
      if (lowered === "true" || lowered === "false") {
        tokens.push({ type: "boolean", value: lowered, index });
      } else if (lowered === "and" || lowered === "or") {
        tokens.push({ type: "operator", value: lowered, index });
      } else if (lowered === "not") {
        tokens.push({ type: "operator", value: lowered, index });
      } else if (isIdentifierChar(normalized[0] ?? "") || normalized.includes("::")) {
        tokens.push({ type: "identifier", value: normalized, index });
      } else {
        throw new FMCalcError(`Unexpected identifier ${threeChar}`, index);
      }
      index = cursor;
      continue;
    }

    throw new FMCalcError(`Unexpected character "${char}"`, index);
  }

  tokens.push({ type: "eof", value: "", index: expression.length });
  return tokens;
}

class Parser {
  private readonly tokens: Token[];
  private cursor = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseExpression(): AstNode {
    const expression = this.parseOr();
    const next = this.peek();
    if (next.type !== "eof") {
      throw new FMCalcError(`Unexpected token ${next.value || next.type}`, next.index);
    }
    return expression;
  }

  private parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.matchOperator("or")) {
      const right = this.parseAnd();
      left = {
        kind: "binary",
        op: "or",
        left,
        right
      };
    }
    return left;
  }

  private parseAnd(): AstNode {
    let left = this.parseComparison();
    while (this.matchOperator("and")) {
      const right = this.parseComparison();
      left = {
        kind: "binary",
        op: "and",
        left,
        right
      };
    }
    return left;
  }

  private parseComparison(): AstNode {
    let left = this.parseConcat();
    while (true) {
      const token = this.peek();
      if (token.type !== "operator") {
        break;
      }
      const normalized = normalizeOperator(token.value);
      if (!["=", "!=", "<", "<=", ">", ">="].includes(normalized)) {
        break;
      }
      this.advance();
      const right = this.parseConcat();
      left = {
        kind: "binary",
        op: normalized,
        left,
        right
      };
    }
    return left;
  }

  private parseConcat(): AstNode {
    let left = this.parseUnary();
    while (true) {
      const token = this.peek();
      if (token.type !== "concat") {
        break;
      }
      this.advance();
      const right = this.parseUnary();
      left = {
        kind: "binary",
        op: "&",
        left,
        right
      };
    }
    return left;
  }

  private parseUnary(): AstNode {
    if (this.matchOperator("not")) {
      return {
        kind: "unary",
        op: "not",
        expression: this.parseUnary()
      };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const token = this.peek();

    if (token.type === "number") {
      this.advance();
      const parsed = Number(token.value);
      if (!Number.isFinite(parsed)) {
        throw new FMCalcError(`Invalid number literal ${token.value}`, token.index);
      }
      return {
        kind: "literal",
        value: parsed
      };
    }

    if (token.type === "string") {
      this.advance();
      return {
        kind: "literal",
        value: token.value
      };
    }

    if (token.type === "boolean") {
      this.advance();
      return {
        kind: "literal",
        value: token.value === "true"
      };
    }

    if (token.type === "identifier") {
      this.advance();
      const identifier = token.value.trim();
      if (this.match("lparen")) {
        const args: AstNode[] = [];
        if (!this.match("rparen")) {
          do {
            args.push(this.parseOr());
          } while (this.match("separator"));
          this.expect("rparen", "Expected ')' to close function call");
        }
        return {
          kind: "call",
          name: identifier,
          args
        };
      }
      return {
        kind: "field",
        name: identifier
      };
    }

    if (this.match("lparen")) {
      const expression = this.parseOr();
      this.expect("rparen", "Expected ')' after expression");
      return expression;
    }

    throw new FMCalcError(`Unexpected token ${token.value || token.type}`, token.index);
  }

  private match(type: TokenType): boolean {
    if (this.peek().type !== type) {
      return false;
    }
    this.cursor += 1;
    return true;
  }

  private matchOperator(operator: "and" | "or" | "not"): boolean {
    const token = this.peek();
    if (token.type !== "operator") {
      return false;
    }
    if (token.value.toLowerCase() !== operator) {
      return false;
    }
    this.cursor += 1;
    return true;
  }

  private expect(type: TokenType, message: string): void {
    const token = this.peek();
    if (token.type !== type) {
      throw new FMCalcError(message, token.index);
    }
    this.cursor += 1;
  }

  private advance(): Token {
    const token = this.tokens[this.cursor];
    if (!token) {
      throw new FMCalcError("Unexpected end of expression");
    }
    this.cursor += 1;
    return token;
  }

  private peek(): Token {
    const token = this.tokens[this.cursor];
    if (!token) {
      return {
        type: "eof",
        value: "",
        index: this.tokens[this.tokens.length - 1]?.index ?? 0
      };
    }
    return token;
  }
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value !== 0;
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) {
      return false;
    }
    const numeric = Number(text);
    if (Number.isFinite(numeric)) {
      return numeric !== 0;
    }
    const lowered = text.toLowerCase();
    if (lowered === "true") {
      return true;
    }
    if (lowered === "false") {
      return false;
    }
    return true;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value != null;
}

function isEmpty(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function normalizeString(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeString(entry)).join(" ");
  }
  return String(value);
}

function compareValues(left: unknown, right: unknown): number {
  const leftText = normalizeString(left).trim();
  const rightText = normalizeString(right).trim();

  const leftNumber = Number(leftText.replace(/,/g, ""));
  const rightNumber = Number(rightText.replace(/,/g, ""));
  if (leftText !== "" && rightText !== "" && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    if (leftNumber < rightNumber) {
      return -1;
    }
    if (leftNumber > rightNumber) {
      return 1;
    }
    return 0;
  }

  const leftDate = Date.parse(leftText);
  const rightDate = Date.parse(rightText);
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    if (leftDate < rightDate) {
      return -1;
    }
    if (leftDate > rightDate) {
      return 1;
    }
    return 0;
  }

  return leftText.localeCompare(rightText, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function resolveFieldValue(name: string, context: FMCalcEvaluationContext): unknown {
  const normalized = name.trim();
  if (!normalized) {
    return "";
  }
  const variableMatch = normalized.match(/^\$+(.+)$/);
  if (variableMatch) {
    const variableName = variableMatch[1]?.trim().toLowerCase() ?? "";
    if (variableName && context.variables) {
      const direct = Object.entries(context.variables).find(
        ([key]) => key.trim().toLowerCase() === variableName
      );
      if (direct) {
        return direct[1];
      }
    }
  }

  const resolveByToken = (record: Record<string, unknown> | null | undefined, token: string): unknown => {
    if (!record) {
      return undefined;
    }
    if (record[token] != null) {
      return record[token];
    }
    const loweredToken = token.toLowerCase();
    const unqualified =
      token.includes("::") ? (token.split("::").pop() ?? token).trim().toLowerCase() : loweredToken;
    for (const [fieldName, value] of Object.entries(record)) {
      const normalizedFieldName = fieldName.trim().toLowerCase();
      if (normalizedFieldName === loweredToken) {
        return value;
      }
      const fieldUnqualified = normalizedFieldName.includes("::")
        ? (normalizedFieldName.split("::").pop() ?? normalizedFieldName).trim()
        : normalizedFieldName;
      if (fieldUnqualified === unqualified) {
        return value;
      }
    }
    return undefined;
  };

  const hasRelation = normalized.includes("::");
  if (hasRelation) {
    const relation = normalized.split("::")[0]?.trim().toLowerCase() ?? "";
    const relatedTable = (context.relatedTableOccurrence ?? "").trim().toLowerCase();
    const currentTable = (context.currentTableOccurrence ?? "").trim().toLowerCase();

    if (relation && relation === relatedTable) {
      const relatedValue = resolveByToken(context.relatedRecord, normalized);
      if (relatedValue !== undefined) {
        return relatedValue;
      }
    }
    if (relation && relation === currentTable) {
      const currentValue = resolveByToken(context.currentRecord, normalized);
      if (currentValue !== undefined) {
        return currentValue;
      }
    }
    const relatedValue = resolveByToken(context.relatedRecord, normalized);
    if (relatedValue !== undefined) {
      return relatedValue;
    }
    const currentValue = resolveByToken(context.currentRecord, normalized);
    if (currentValue !== undefined) {
      return currentValue;
    }
    return "";
  }

  // Unqualified field names follow the current layout context first, then related row context.
  const currentValue = resolveByToken(context.currentRecord, normalized);
  if (currentValue !== undefined) {
    return currentValue;
  }
  const relatedValue = resolveByToken(context.relatedRecord, normalized);
  if (relatedValue !== undefined) {
    return relatedValue;
  }

  return "";
}

function countPatterns(text: string, pattern: string): number {
  if (!pattern) {
    return 0;
  }
  let count = 0;
  let cursor = 0;
  const loweredText = text.toLowerCase();
  const loweredPattern = pattern.toLowerCase();
  while (cursor < loweredText.length) {
    const next = loweredText.indexOf(loweredPattern, cursor);
    if (next < 0) {
      break;
    }
    count += 1;
    cursor = next + loweredPattern.length;
  }
  return count;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  const text = normalizeString(value).trim();
  if (!text) {
    return fallback;
  }
  const numeric = Number(text.replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toInteger(value: unknown, fallback = 0): number {
  const numeric = toFiniteNumber(value, fallback);
  return numeric < 0 ? Math.ceil(numeric) : Math.floor(numeric);
}

function clampCodePoint(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 0x10ffff) {
    return 0x10ffff;
  }
  return Math.floor(value);
}

function padTwo(value: number): string {
  const normalized = Number.isFinite(value) ? Math.floor(Math.abs(value)) : 0;
  return String(normalized).padStart(2, "0");
}

function formatIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(date.getUTCDate())}`;
}

function formatIsoTime(date: Date): string {
  return `${padTwo(date.getUTCHours())}:${padTwo(date.getUTCMinutes())}:${padTwo(date.getUTCSeconds())}`;
}

function resolveNow(context: FMCalcEvaluationContext): Date {
  const rawNow = context.now;
  if (rawNow instanceof Date && Number.isFinite(rawNow.getTime())) {
    return rawNow;
  }
  if (typeof rawNow === "string" || typeof rawNow === "number") {
    const parsed = new Date(rawNow);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function resolveDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === "number") {
    const parsedFromEpoch = new Date(value);
    if (Number.isFinite(parsedFromEpoch.getTime())) {
      return parsedFromEpoch;
    }
    return null;
  }
  const text = normalizeString(value).trim();
  if (!text) {
    return null;
  }
  const parsedValue = Date.parse(text);
  if (Number.isNaN(parsedValue)) {
    return null;
  }
  return new Date(parsedValue);
}

function properCase(value: string): string {
  return value.replace(/\b([A-Za-z])([A-Za-z]*)\b/g, (_token, first: string, rest: string) => {
    return `${first.toUpperCase()}${rest.toLowerCase()}`;
  });
}

function trimAllWhitespace(value: string): string {
  return value
    .replace(/[\t\r\n ]+/g, " ")
    .trim();
}

function splitReturnDelimited(value: string): string[] {
  return value.split(/\r\n|\n|\r/);
}

function replaceAllCaseSensitive(text: string, search: string, replacement: string): string {
  if (!search) {
    return text;
  }
  return text.split(search).join(replacement);
}

function applySubstituteChain(text: string, chain: string[]): string {
  if (chain.length < 2) {
    return text;
  }
  let output = text;
  for (let index = 0; index + 1 < chain.length; index += 2) {
    const search = chain[index] ?? "";
    const replacement = chain[index + 1] ?? "";
    output = replaceAllCaseSensitive(output, search, replacement);
  }
  return output;
}

function positionInText(text: string, search: string, start: number, occurrence: number): number {
  if (!search) {
    return 0;
  }
  let cursor = Math.max(0, start - 1);
  let seen = 0;
  while (cursor <= text.length) {
    const next = text.indexOf(search, cursor);
    if (next < 0) {
      return 0;
    }
    seen += 1;
    if (seen >= occurrence) {
      return next + 1;
    }
    cursor = next + search.length;
  }
  return 0;
}

function evaluateListValues(node: Extract<AstNode, { kind: "call" }>, context: FMCalcEvaluationContext): string {
  const values: string[] = [];
  for (const arg of node.args) {
    const value = evaluateNode(arg, context);
    if (Array.isArray(value)) {
      for (const nested of value) {
        const normalized = normalizeString(nested).trim();
        if (normalized) {
          values.push(normalized);
        }
      }
      continue;
    }
    const normalized = normalizeString(value).trim();
    if (normalized) {
      values.push(normalized);
    }
  }
  return values.join("\n");
}

function averageNumbers(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, current) => sum + current, 0);
  return total / values.length;
}

function truncateNumber(value: number, precision: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(precision)) {
    return 0;
  }
  const safePrecision = toInteger(precision, 0);
  if (safePrecision === 0) {
    return value < 0 ? Math.ceil(value) : Math.floor(value);
  }
  const factor = Math.pow(10, Math.abs(safePrecision));
  if (!Number.isFinite(factor) || factor === 0) {
    return value;
  }
  if (safePrecision > 0) {
    const scaled = value * factor;
    const truncated = scaled < 0 ? Math.ceil(scaled) : Math.floor(scaled);
    return truncated / factor;
  }
  const scaled = value / factor;
  const truncated = scaled < 0 ? Math.ceil(scaled) : Math.floor(scaled);
  return truncated * factor;
}

function roundNumber(value: number, precision: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(precision)) {
    return 0;
  }
  const safePrecision = toInteger(precision, 0);
  if (safePrecision === 0) {
    return Math.round(value);
  }
  const factor = Math.pow(10, Math.abs(safePrecision));
  if (!Number.isFinite(factor) || factor === 0) {
    return value;
  }
  if (safePrecision > 0) {
    return Math.round(value * factor) / factor;
  }
  return Math.round(value / factor) * factor;
}

function buildDateFromParts(year: number, month: number, day: number): Date {
  const normalizedYear = Number.isFinite(year) ? Math.floor(year) : 0;
  const normalizedMonth = Number.isFinite(month) ? Math.floor(month) - 1 : 0;
  const normalizedDay = Number.isFinite(day) ? Math.floor(day) : 1;
  return new Date(Date.UTC(normalizedYear, normalizedMonth, normalizedDay));
}

function buildTimeFromParts(hours: number, minutes: number, seconds: number): Date {
  const normalizedHours = Number.isFinite(hours) ? Math.floor(hours) : 0;
  const normalizedMinutes = Number.isFinite(minutes) ? Math.floor(minutes) : 0;
  const normalizedSeconds = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
  return new Date(Date.UTC(1970, 0, 1, normalizedHours, normalizedMinutes, normalizedSeconds));
}

function evaluateCall(node: Extract<AstNode, { kind: "call" }>, context: FMCalcEvaluationContext): unknown {
  const name = node.name.trim().toLowerCase();
  const arg = (index: number) => evaluateNode(node.args[index], context);
  const argText = (index: number) => normalizeString(arg(index));
  const argNumber = (index: number, fallback = 0) => toFiniteNumber(arg(index), fallback);

  if (name === "isempty") {
    return isEmpty(arg(0));
  }
  if (name === "isvalid") {
    const value = arg(0);
    if (value == null) {
      return false;
    }
    if (typeof value === "number") {
      return Number.isFinite(value);
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return true;
  }
  if (name === "patterncount") {
    return countPatterns(argText(0), argText(1));
  }
  if (name === "if") {
    const condition = toBoolean(arg(0));
    if (condition) {
      return arg(1);
    }
    return node.args.length > 2 ? arg(2) : "";
  }
  if (name === "case") {
    const lastIndex = node.args.length - 1;
    for (let index = 0; index < lastIndex; index += 2) {
      const conditionNode = node.args[index];
      const resultNode = node.args[index + 1];
      if (!conditionNode || !resultNode) {
        break;
      }
      if (toBoolean(evaluateNode(conditionNode, context))) {
        return evaluateNode(resultNode, context);
      }
    }
    if (node.args.length % 2 === 1 && node.args[lastIndex]) {
      return evaluateNode(node.args[lastIndex], context);
    }
    return "";
  }
  if (name === "length") {
    return argText(0).length;
  }
  if (name === "left") {
    const value = argText(0);
    const count = Math.max(0, toInteger(arg(1), 0));
    return value.slice(0, count);
  }
  if (name === "right") {
    const value = argText(0);
    const count = Math.max(0, toInteger(arg(1), 0));
    if (count === 0) {
      return "";
    }
    return value.slice(-count);
  }
  if (name === "middle") {
    const value = argText(0);
    const start = Math.max(1, toInteger(arg(1), 1));
    const count = Math.max(0, toInteger(arg(2), value.length));
    return value.slice(start - 1, start - 1 + count);
  }
  if (name === "lower") {
    return argText(0).toLowerCase();
  }
  if (name === "upper") {
    return argText(0).toUpperCase();
  }
  if (name === "proper") {
    return properCase(argText(0));
  }
  if (name === "trim") {
    return argText(0).trim();
  }
  if (name === "trimall") {
    return trimAllWhitespace(argText(0));
  }
  if (name === "substitute") {
    const source = argText(0);
    const chain = node.args.slice(1).map((_value, index) => argText(index + 1));
    return applySubstituteChain(source, chain);
  }
  if (name === "position") {
    const source = argText(0);
    const search = argText(1);
    const start = Math.max(1, toInteger(arg(2), 1));
    const occurrence = Math.max(1, toInteger(arg(3), 1));
    return positionInText(source, search, start, occurrence);
  }
  if (name === "filter") {
    const source = argText(0);
    const allowedChars = new Set(argText(1).split(""));
    if (allowedChars.size === 0) {
      return "";
    }
    return source
      .split("")
      .filter((char) => allowedChars.has(char))
      .join("");
  }
  if (name === "list") {
    return evaluateListValues(node, context);
  }
  if (name === "valuecount") {
    const source = argText(0);
    if (!source) {
      return 0;
    }
    return splitReturnDelimited(source).length;
  }
  if (name === "getvalue") {
    const source = splitReturnDelimited(argText(0));
    const index = Math.max(1, toInteger(arg(1), 1));
    return source[index - 1] ?? "";
  }
  if (name === "char") {
    const codePoint = clampCodePoint(argNumber(0, 0));
    return String.fromCodePoint(codePoint);
  }
  if (name === "code") {
    const source = argText(0);
    if (!source) {
      return 0;
    }
    const first = source.codePointAt(0);
    return Number.isFinite(first) ? first : 0;
  }
  if (name === "getastext") {
    return normalizeString(arg(0));
  }
  if (name === "getasnumber") {
    return toFiniteNumber(arg(0), 0);
  }
  if (name === "abs") {
    return Math.abs(argNumber(0, 0));
  }
  if (name === "int") {
    return toInteger(arg(0), 0);
  }
  if (name === "round") {
    return roundNumber(argNumber(0, 0), argNumber(1, 0));
  }
  if (name === "ceiling") {
    return Math.ceil(argNumber(0, 0));
  }
  if (name === "floor") {
    return Math.floor(argNumber(0, 0));
  }
  if (name === "mod") {
    const left = argNumber(0, 0);
    const right = argNumber(1, 0);
    if (right === 0) {
      return 0;
    }
    return left % right;
  }
  if (name === "min") {
    const values = node.args.map((_value, index) => argNumber(index, 0));
    return values.length > 0 ? Math.min(...values) : 0;
  }
  if (name === "max") {
    const values = node.args.map((_value, index) => argNumber(index, 0));
    return values.length > 0 ? Math.max(...values) : 0;
  }
  if (name === "sum") {
    const values = node.args.map((_value, index) => argNumber(index, 0));
    return values.reduce((sum, current) => sum + current, 0);
  }
  if (name === "average") {
    const values = node.args.map((_value, index) => argNumber(index, 0));
    return averageNumbers(values);
  }
  if (name === "truncate") {
    return truncateNumber(argNumber(0, 0), argNumber(1, 0));
  }
  if (name === "random") {
    return Math.random();
  }
  if (name === "date") {
    const date = buildDateFromParts(argNumber(0, 0), argNumber(1, 1), argNumber(2, 1));
    if (!Number.isFinite(date.getTime())) {
      return "";
    }
    return formatIsoDate(date);
  }
  if (name === "time") {
    const time = buildTimeFromParts(argNumber(0, 0), argNumber(1, 0), argNumber(2, 0));
    if (!Number.isFinite(time.getTime())) {
      return "";
    }
    return formatIsoTime(time);
  }
  if (name === "day") {
    const value = resolveDate(arg(0));
    return value ? value.getUTCDate() : 0;
  }
  if (name === "month") {
    const value = resolveDate(arg(0));
    return value ? value.getUTCMonth() + 1 : 0;
  }
  if (name === "year") {
    const value = resolveDate(arg(0));
    return value ? value.getUTCFullYear() : 0;
  }
  if (name === "hour") {
    const value = resolveDate(arg(0));
    return value ? value.getUTCHours() : 0;
  }
  if (name === "minute") {
    const value = resolveDate(arg(0));
    return value ? value.getUTCMinutes() : 0;
  }
  if (name === "second") {
    const value = resolveDate(arg(0));
    return value ? value.getUTCSeconds() : 0;
  }
  if (name === "get") {
    const firstArg = node.args[0];
    let key = "";
    if (firstArg?.kind === "field") {
      key = firstArg.name.trim().toLowerCase();
    } else {
      key = normalizeString(evaluateNode(firstArg, context)).trim().toLowerCase();
    }
    const now = resolveNow(context);
    if (key === "recordid") {
      const related = context.relatedRecord as Record<string, unknown> | undefined;
      const current = context.currentRecord as Record<string, unknown> | undefined;
      return String(related?.recordId ?? current?.recordId ?? "");
    }
    if (key === "currentdate" || key === "currenthostdate") {
      return formatIsoDate(now);
    }
    if (key === "currenttime" || key === "currenthosttime") {
      return formatIsoTime(now);
    }
    if (key === "currenttimestamp" || key === "currenthosttimestamp") {
      return `${formatIsoDate(now)} ${formatIsoTime(now)}`;
    }
    if (key === "layoutname") {
      return context.currentLayoutName ?? "";
    }
    if (key === "accountname") {
      return context.currentAccountName ?? "";
    }
    if (key === "foundcount") {
      return toInteger(context.variables?.__foundCount, 0);
    }
    return "";
  }
  throw new FMCalcError(`Unsupported function ${node.name}`);
}

function evaluateNode(node: AstNode | undefined, context: FMCalcEvaluationContext): unknown {
  if (!node) {
    return "";
  }
  if (node.kind === "literal") {
    return node.value;
  }
  if (node.kind === "field") {
    return resolveFieldValue(node.name, context);
  }
  if (node.kind === "unary") {
    if (node.op === "not") {
      return !toBoolean(evaluateNode(node.expression, context));
    }
    throw new FMCalcError("Unsupported unary operator");
  }
  if (node.kind === "binary") {
    if (node.op === "&") {
      return `${normalizeString(evaluateNode(node.left, context))}${normalizeString(evaluateNode(node.right, context))}`;
    }
    if (node.op === "and") {
      return toBoolean(evaluateNode(node.left, context)) && toBoolean(evaluateNode(node.right, context));
    }
    if (node.op === "or") {
      return toBoolean(evaluateNode(node.left, context)) || toBoolean(evaluateNode(node.right, context));
    }
    const comparison = compareValues(evaluateNode(node.left, context), evaluateNode(node.right, context));
    if (node.op === "=") {
      return comparison === 0;
    }
    if (node.op === "!=") {
      return comparison !== 0;
    }
    if (node.op === "<") {
      return comparison < 0;
    }
    if (node.op === "<=") {
      return comparison <= 0;
    }
    if (node.op === ">") {
      return comparison > 0;
    }
    if (node.op === ">=") {
      return comparison >= 0;
    }
    throw new FMCalcError(`Unsupported binary operator ${node.op}`);
  }
  return evaluateCall(node, context);
}

function collectFieldDependencies(node: AstNode | undefined, bucket: Set<string>): void {
  if (!node) {
    return;
  }
  if (node.kind === "field") {
    const token = node.name.trim();
    if (token) {
      bucket.add(token);
    }
    return;
  }
  if (node.kind === "unary") {
    collectFieldDependencies(node.expression, bucket);
    return;
  }
  if (node.kind === "binary") {
    collectFieldDependencies(node.left, bucket);
    collectFieldDependencies(node.right, bucket);
    return;
  }
  if (node.kind === "call") {
    for (const argument of node.args) {
      collectFieldDependencies(argument, bucket);
    }
  }
}

function isVolatileCallNode(node: Extract<AstNode, { kind: "call" }>): boolean {
  const name = node.name.trim().toLowerCase();
  if (name === "random") {
    return true;
  }
  if (name === "get") {
    const firstArg = node.args[0];
    const key = firstArg
      ? firstArg.kind === "field"
        ? firstArg.name.trim().toLowerCase()
        : firstArg.kind === "literal"
          ? normalizeString(firstArg.value).trim().toLowerCase()
          : ""
      : "";
    if (
      key === "currentdate" ||
      key === "currenttime" ||
      key === "currenttimestamp" ||
      key === "currenthostdate" ||
      key === "currenthosttime" ||
      key === "currenthosttimestamp"
    ) {
      return true;
    }
  }
  return false;
}

function astContainsVolatileCall(node: AstNode | undefined): boolean {
  if (!node) {
    return false;
  }
  if (node.kind === "call") {
    if (isVolatileCallNode(node)) {
      return true;
    }
    return node.args.some((entry) => astContainsVolatileCall(entry));
  }
  if (node.kind === "binary") {
    return astContainsVolatileCall(node.left) || astContainsVolatileCall(node.right);
  }
  if (node.kind === "unary") {
    return astContainsVolatileCall(node.expression);
  }
  return false;
}

function parseWithCache(source: string): ParsedExpressionCacheEntry {
  const cached = parsedExpressionCache.get(source);
  if (cached) {
    setWithCap(parsedExpressionCache, source, cached, PARSED_EXPRESSION_CACHE_LIMIT);
    return cached;
  }
  const parser = new Parser(tokenize(source));
  const ast = parser.parseExpression();
  const dependencies = new Set<string>();
  collectFieldDependencies(ast, dependencies);
  const entry: ParsedExpressionCacheEntry = {
    ast,
    dependencies: [...dependencies],
    volatile: astContainsVolatileCall(ast)
  };
  setWithCap(parsedExpressionCache, source, entry, PARSED_EXPRESSION_CACHE_LIMIT);
  return entry;
}

function stableVariableHash(variables: Record<string, unknown> | undefined): string {
  if (!variables) {
    return "";
  }
  const entries = Object.entries(variables)
    .map(([name, value]) => [name.trim(), value] as const)
    .filter(([name]) => name.length > 0)
    .sort((left, right) => left[0].localeCompare(right[0]));
  if (!entries.length) {
    return "";
  }
  try {
    return JSON.stringify(entries);
  } catch {
    return "";
  }
}

function buildEvaluationCacheKey(
  source: string,
  parsed: ParsedExpressionCacheEntry,
  context: FMCalcEvaluationContext
): string {
  const currentRecordId = String((context.currentRecord as Record<string, unknown> | undefined)?.recordId ?? "").trim();
  const relatedRecordId = String((context.relatedRecord as Record<string, unknown> | undefined)?.recordId ?? "").trim();
  const dependencyParts = parsed.dependencies.map((fieldName) => {
    const value = resolveFieldValue(fieldName, context);
    const normalizedValue = normalizeString(value);
    return `${fieldName.toLowerCase()}=${normalizedValue}`;
  });
  const variableHash = stableVariableHash(context.variables);
  return `${source}\ncur:${currentRecordId}\nrel:${relatedRecordId}\ndeps:${dependencyParts.join("|")}\nvars:${variableHash}`;
}

export function evaluateFMCalcExpression(
  expression: string,
  context: FMCalcEvaluationContext = {}
): FMCalcEvaluationResult {
  const source = expression.trim();
  if (!source) {
    return {
      ok: true,
      value: ""
    };
  }
  try {
    const parsed = parseWithCache(source);
    const evaluationCacheKey = parsed.volatile ? "" : buildEvaluationCacheKey(source, parsed, context);
    const cached = parsed.volatile ? null : evaluationCache.get(evaluationCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setWithCap(evaluationCache, evaluationCacheKey, cached, EVALUATION_CACHE_LIMIT);
      return {
        ok: true,
        value: cached.value
      };
    }
    const value = evaluateNode(parsed.ast, context);
    if (!parsed.volatile) {
      setWithCap(
        evaluationCache,
        evaluationCacheKey,
        {
          value,
          expiresAt: Date.now() + EVALUATION_CACHE_TTL_MS
        },
        EVALUATION_CACHE_LIMIT
      );
    }
    return {
      ok: true,
      value
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown FM calculation error";
    return {
      ok: false,
      value: null,
      error: message
    };
  }
}

export function evaluateFMCalcBoolean(
  expression: string,
  context: FMCalcEvaluationContext = {},
  fallback = false
): FMCalcEvaluationResult<boolean> {
  const result = evaluateFMCalcExpression(expression, context);
  if (!result.ok) {
    return {
      ...result
    };
  }
  return {
    ok: true,
    value: toBoolean(result.value ?? fallback)
  };
}

export function evaluateFMCalcText(
  expression: string,
  context: FMCalcEvaluationContext = {},
  fallback = ""
): FMCalcEvaluationResult<string> {
  const result = evaluateFMCalcExpression(expression, context);
  if (!result.ok) {
    return {
      ...result
    };
  }
  return {
    ok: true,
    value: normalizeString(result.value ?? fallback)
  };
}
