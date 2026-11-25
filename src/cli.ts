#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { audit } from "./audit.js";
import { EnvFileError, loadEnvFiles } from "./loadEnvFiles.js";
import { CliUsageError, HELP_TEXT, parseArgs } from "./parseArgs.js";
import { formatReport } from "./report.js";

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
    const result = audit(loaded.example.map, loaded.actual.map, {
      strict: parsed.options.strict,
    });

    const report = formatReport({
      examplePath: loaded.examplePath,
      envPath: loaded.envPath,
      envFileExists: loaded.envFileExists,
      exampleIssues: loaded.example.issues,
      envIssues: loaded.actual.issues,
      result,
    });

    for (const line of report.errorLines) {
      io.error(line);
    }
    for (const line of report.lines) {
      io.log(line);
    }

    return result.ok ? 0 : 1;
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
