import type { AuditResult, EnvMap, Finding } from "./types.js";

export interface AuditParams {
  strict?: boolean;
}

export function audit(
  expected: EnvMap,
  actual: EnvMap,
  params: AuditParams = {},
): AuditResult {
  // prepare the data
  const strict = params.strict ?? false;
  const findings: Finding[] = [];
  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);

  // check expected keys
  for(const key of expectedKeys) {
    const expectedEntry = expected[key];
    if(expectedEntry === undefined) continue;

    const required = !expectedEntry.optional;
    const actualEntry = actual[key];

    if (actualEntry === undefined) {
      findings.push({ kind: "missing", key, required });
      continue;
    }

    if (actualEntry.value.trim() === "") findings.push({ kind: "empty", key, required });
  }

  // check unused keys
  const unusedKeys = actualKeys
    .filter((key) => !(key in expected))
    .sort((a, b) => a.localeCompare(b));

  for (const key of unusedKeys) {
    findings.push({ kind: "unused", key, required: false });
  }

  const optionalExpected = expectedKeys.filter((key) => expected[key]?.optional).length;

  const ok = !findings.some((finding) => isFailingFinding(finding, strict));

  return {
    findings,
    ok,
    stats: {
      expectedKeys: expectedKeys.length,
      actualKeys: actualKeys.length,
      optionalExpected,
    },
  };
}

// decide if a finding should make the audit fail
function isFailingFinding(finding: Finding, strict: boolean): boolean {
  if (finding.kind === "unused") return strict;
  if (finding.kind === "missing" || finding.kind === "empty") return finding.required || strict;
  
  return false;
}
