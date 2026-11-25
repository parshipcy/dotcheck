import path from "node:path";
import type { AuditResult, Finding, ParseIssue } from "./types.js";

export interface ReportInput {
  examplePath: string;
  envPath: string;
  envFileExists: boolean;
  exampleIssues: ParseIssue[];
  envIssues: ParseIssue[];
  result: AuditResult;
}

export interface FormattedReport {
  // normal terminal output (no secret values)
  lines: string[];
  // parse issues and similar diagnostics
  errorLines: string[];
}

// turn an audit into printable text. Findings include key names only.
export function formatReport(input: ReportInput): FormattedReport {
  const errorLines = [
    ...formatParseIssues("example", input.exampleIssues),
    ...formatParseIssues("env", input.envIssues),
  ];

  const lines: string[] = [];
  const exampleName = path.basename(input.examplePath);
  const envName = path.basename(input.envPath);
  const { result } = input;

  if (!input.envFileExists) {
    lines.push(`Note: ${envName} not found; treating as empty.`);
  }

  lines.push("Envlens");
  lines.push(
    `  ${exampleName}  ${result.stats.expectedKeys} keys (${result.stats.optionalExpected} optional)`,
  );
  lines.push(`  ${envName}  ${result.stats.actualKeys} keys`);

  if (result.findings.length === 0) {
    lines.push("");
    lines.push("All environment variables look good.");
    return { lines, errorLines };
  }

  lines.push("");
  for (const finding of result.findings) {
    lines.push(`  ${formatFinding(finding)}`);
  }
  lines.push("");
  lines.push(
    result.ok
      ? "Completed with warnings."
      : "Failed: required environment variables are misconfigured.",
  );

  return { lines, errorLines };
}

export function formatFinding(finding: Finding): string {
  const level = finding.required ? "ERROR" : "WARN";
  return `${level}  ${finding.kind.padEnd(7)}  ${finding.key}`;
}

export function formatParseIssues(
  source: string,
  issues: ParseIssue[],
): string[] {
  return issues.map(
    (issue) => `${source} line ${issue.line}: ${issue.kind} (${issue.detail})`,
  );
}
