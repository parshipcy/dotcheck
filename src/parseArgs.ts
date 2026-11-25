import { defaultAuditOptions, type AuditOptions } from "./types.js";

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export type ParsedCli =
  | { help: true }
  | { help: false; options: AuditOptions };

export function parseArgs(argv: string[]): ParsedCli {
  const options: AuditOptions = { ...defaultAuditOptions };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }

    if (arg === "--strict") {
      options.strict = true;
      continue;
    }

    if (arg === "--dir" || arg === "--example" || arg === "--env") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new CliUsageError(`Missing value for ${arg}`);
      }
      i += 1;
      if (arg === "--dir") options.dir = value;
      if (arg === "--example") options.exampleFile = value;
      if (arg === "--env") options.envFile = value;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliUsageError(`Unknown option: ${arg}`);
    }

    throw new CliUsageError(`Unexpected argument: ${arg}`);
  }

  return { help: false, options };
}

export const HELP_TEXT = `Usage: dotcheck [options]

Check that a project's environment variables match .env.example.

Options:
  --dir <path>        Directory containing env files (default: current directory)
  --example <file>    Example filename (default: .env.example)
  --env <file>        Env filename (default: .env)
  --strict            Fail on unused keys and optional missing/empty values
  -h, --help          Show this help
`;
