import { describe, it, expect } from "vitest";
import { CliUsageError, parseArgs } from "../src/parseArgs.js";
import { defaultAuditOptions } from "../src/types.js";

describe("parseArgs", () => {
  it("returns defaults when given no flags", () => {
    expect(parseArgs([])).toEqual({
      help: false,
      options: defaultAuditOptions,
    });
  });

  it("parses flags and help", () => {
    expect(parseArgs(["--help"])).toEqual({ help: true });
    expect(parseArgs(["-h"])).toEqual({ help: true });

    const parsed = parseArgs([
      "--dir",
      "./app",
      "--example",
      ".env.sample",
      "--env",
      ".env.local",
      "--strict",
    ]);
    expect(parsed).toEqual({
      help: false,
      options: {
        dir: "./app",
        exampleFile: ".env.sample",
        envFile: ".env.local",
        strict: true,
      },
    });
  });

  it("rejects unknown flags and missing values", () => {
    expect(() => parseArgs(["--nope"])).toThrow(CliUsageError);
    expect(() => parseArgs(["--dir"])).toThrow(/Missing value/);
    expect(() => parseArgs(["extra"])).toThrow(/Unexpected argument/);
  });
});
