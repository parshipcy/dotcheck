#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { audit } from "./audit.js";
import { EnvFileError, loadEnvFiles } from "./loadEnvFiles.js";
import { CliUsageError, HELP_TEXT, parseArgs } from "./parseArgs.js";
import type { Finding, ParseIssue } from "./types.js";

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
}

const defaultIo: CliIo = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

export async function runCli(
  argv: string[],
  io: CliIo = defaultIo,
): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    if (parsed.help) {
      io.log(HELP_TEXT.trimEnd());
      return 0;
    }

    const loaded = await loadEnvFiles(parsed.options);
    printParseIssues("example", loaded.example.issues, io);
    printParseIssues("env", loaded.actual.issues, io);

    if (!loaded.envFileExists) {
      io.log(`Note: ${loaded.envPath} not found; treating as empty.`);
    }

    const result = audit(loaded.example.map, loaded.actual.map, {
      strict: parsed.options.strict,
    });

    io.log(
      `${path.basename(loaded.examplePath)}  ${result.stats.expectedKeys} keys (${result.stats.optionalExpected} optional)`,
    );
    io.log(
      `${path.basename(loaded.envPath)}  ${result.stats.actualKeys} keys`,
    );

    if (result.findings.length === 0) {
      io.log("All environment variables look good.");
      return 0;
    }

    for (const finding of result.findings) {
      io.log(formatFinding(finding));
    }

    if (result.ok) {
      io.log("Completed with warnings.");
      return 0;
    }

    io.log("Failed: required environment variables are misconfigured.");
    return 1;
  } catch (error) {
    if (error instanceof CliUsageError || error instanceof EnvFileError) {
      io.error(error.message);
      return 2;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    io.error(message);
    return 2;
  }
}

function printParseIssues(
  source: string,
  issues: ParseIssue[],
  io: CliIo,
): void {
  for (const issue of issues) {
    io.error(`${source} line ${issue.line}: ${issue.kind} (${issue.detail})`);
  }
}

function formatFinding(finding: Finding): string {
  const level = finding.required ? "ERROR" : "WARN";
  return `${level}  ${finding.kind.padEnd(7)}  ${finding.key}`;
}

async function main(): Promise<void> {
  process.exitCode = await runCli(process.argv.slice(2));
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isDirectRun()) {
  void main();
}
