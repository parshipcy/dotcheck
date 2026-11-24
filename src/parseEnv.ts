import type { EnvMap, EnvEntry, ParseIssue } from "./types.js";

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface ParseResult {
  map: EnvMap;
  issues: ParseIssue[];
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function stripExportPrefix(line: string): string {
  return line.startsWith("export ") ? line.slice("export ".length) : line;
}

function isOptionalComment(line: string): boolean {
  const body = line.slice(1).trim();
  return /optional/i.test(body);
}


export function parseEnv(content: string): ParseResult {
  const map: EnvMap = {};
  const issues: ParseIssue[] = [];
  let pendingOptional = false;

  const lines = content.replace(/\r\n/g, "\n").split("\n");

  for (const [i, rawLine] of lines.entries()) {
    const lineNumber = i + 1;
    let line = rawLine.trim();
    if (line === "") continue;

    if (line.startsWith("#")) {
      if (isOptionalComment(line)) pendingOptional = true;
      continue;
    }

    line = stripExportPrefix(line);

    const eq = line.indexOf("=");
    if (eq === -1) {
      issues.push({
        kind: "invalid_line",
        line: lineNumber,
        detail: "expected KEY=VALUE",
      });
      pendingOptional = false;
      continue;
    }

    const rawKey = line.slice(0, eq).trim();
    const rawValue = line.slice(eq + 1);

    if (!KEY_PATTERN.test(rawKey)) {
      issues.push({
        kind: "invalid_line",
        line: lineNumber,
        detail: rawKey ? `invalid key name: ${rawKey}` : "empty key",
      });
      pendingOptional = false;
      continue;
    }

    if (rawKey in map) {
      issues.push({
        kind: "duplicate_key",
        line: lineNumber,
        detail: rawKey,
      });
    }

    const optional = pendingOptional;
    pendingOptional = false;

    const entry: EnvEntry = {
      value: unquote(rawValue),
      optional,
    };
    map[rawKey] = entry;
  }

  return { map, issues };
}
