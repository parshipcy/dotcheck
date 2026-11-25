import fs from "node:fs/promises";
import path from "node:path";
import { parseEnv, type ParseResult } from "./parseEnv.js";
import type { AuditOptions } from "./types.js";

export type LoadEnvOptions = Pick<
  AuditOptions,
  "dir" | "exampleFile" | "envFile"
>;

export class EnvFileError extends Error {
  readonly code: "example_not_found" | "read_failed";
  readonly filePath: string;

  constructor(
    code: "example_not_found" | "read_failed",
    filePath: string,
    message: string,
  ) {
    super(message);
    this.name = "EnvFileError";
    this.code = code;
    this.filePath = filePath;
  }
}

export interface LoadedEnvFiles {
  example: ParseResult;
  actual: ParseResult;
  examplePath: string;
  envPath: string;
  envFileExists: boolean;
}

export async function loadEnvFiles(
  options: LoadEnvOptions,
): Promise<LoadedEnvFiles> {
  const dir = path.resolve(options.dir);
  const examplePath = path.resolve(dir, options.exampleFile);
  const envPath = path.resolve(dir, options.envFile);

  const exampleContent = await readRequiredFile(examplePath, "example");
  const envRead = await readOptionalFile(envPath);

  return {
    example: parseEnv(exampleContent),
    actual: parseEnv(envRead.content),
    examplePath,
    envPath,
    envFileExists: envRead.exists,
  };
}

async function readRequiredFile(
  filePath: string,
  role: "example",
): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFound(error)) {
      throw new EnvFileError(
        "example_not_found",
        filePath,
        `Missing ${role} file: ${filePath}`,
      );
    }
    throw wrapReadError(filePath, error);
  }
}

async function readOptionalFile(
  filePath: string,
): Promise<{ content: string; exists: boolean }> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return { content, exists: true };
  } catch (error) {
    if (isNotFound(error)) {
      return { content: "", exists: false };
    }
    throw wrapReadError(filePath, error);
  }
}

function wrapReadError(filePath: string, error: unknown): EnvFileError {
  const detail = error instanceof Error ? error.message : "unknown error";
  return new EnvFileError(
    "read_failed",
    filePath,
    `Could not read ${filePath}: ${detail}`,
  );
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
