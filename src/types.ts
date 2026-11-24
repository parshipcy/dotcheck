/**
 * Kinds of problems envlens can report.
 * Union = only these four strings are valid.
 */
export type FindingKind = "missing" | "empty" | "unused";

/**
 * One issue for a single variable name.
 * We never store or print `value` here - only `key`.
 */
export interface Finding {
  kind: FindingKind;
  key: string;
  required: boolean;
}

/**
 * One variable after parsing a file.
 */
export interface EnvEntry {
  value: string;
  optional: boolean;
}

/**
 * Map of variable name → entry.
 * Prefer Record over index signature when keys are dynamic strings.
 */
export type EnvMap = Record<string, EnvEntry>;

/**
 * Outcome of comparing example vs actual.
 */
export interface AuditResult {
  findings: Finding[];
  ok: boolean;
  stats: {
    expectedKeys: number;
    actualKeys: number;
    optionalExpected: number;
  };
}

/**
 * CLI / programmatic options (Step 5–6 will use these).
 */
export interface AuditOptions {
  /** Directory containing .env files (default: process.cwd()) */
  dir: string;
  exampleFile: string;
  envFile: string;
  strict: boolean;
}

/** Defaults so cli.ts can do: { ...defaultAuditOptions, ...parsed } */
export const defaultAuditOptions: AuditOptions = {
  dir: ".",
  exampleFile: ".env.example",
  envFile: ".env",
  strict: false,
};

/**
 * Parse-time problems (bad line, not a secret).
 */
export type ParseIssueKind = "invalid_line" | "duplicate_key";

export interface ParseIssue {
  kind: ParseIssueKind;
  line: number;
  /** Snippet without value, e.g. key name only if safe */
  detail: string;
}