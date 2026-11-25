import { describe, it, expect } from "vitest";
import { audit } from "../src/audit.js";
import { parseEnv } from "../src/parseEnv.js";
import { formatFinding, formatReport } from "../src/report.js";

describe("formatReport", () => {
  it("prints a success summary with stats and no findings", () => {
    const expected = parseEnv("PORT=3000\n").map;
    const actual = parseEnv("PORT=4000\n").map;
    const report = formatReport({
      examplePath: "/tmp/.env.example",
      envPath: "/tmp/.env",
      envFileExists: true,
      exampleIssues: [],
      envIssues: [],
      result: audit(expected, actual),
    });

    const text = report.lines.join("\n");
    expect(text).toContain("dotcheck");
    expect(text).toContain(".env.example");
    expect(text).toContain("look good");
    expect(report.errorLines).toHaveLength(0);
  });

  it("prints key names only, never secret values", () => {
    const secret = "super-secret-token";
    const expected = parseEnv("API_KEY=\n").map;
    const actual = parseEnv(`LEAK=${secret}\n`).map;
    const report = formatReport({
      examplePath: ".env.example",
      envPath: ".env",
      envFileExists: true,
      exampleIssues: [],
      envIssues: [],
      result: audit(expected, actual),
    });

    const text = [...report.lines, ...report.errorLines].join("\n");
    expect(text).toContain("API_KEY");
    expect(text).toContain("LEAK");
    expect(text).toContain("ERROR");
    expect(text).toContain("WARN");
    expect(text).not.toContain(secret);
    expect(text).toContain("Failed:");
  });

  it("notes a missing env file and formats parse issues on stderr", () => {
    const expected = parseEnv("PORT=1\n").map;
    const report = formatReport({
      examplePath: ".env.example",
      envPath: ".env",
      envFileExists: false,
      exampleIssues: [
        { kind: "duplicate_key", line: 3, detail: "PORT" },
      ],
      envIssues: [],
      result: audit(expected, {}),
    });

    expect(report.lines.join("\n")).toContain("not found");
    expect(report.errorLines.some((line) => line.includes("duplicate_key"))).toBe(
      true,
    );
    expect(report.errorLines.join("\n")).not.toMatch(/=/);
  });
});

describe("formatFinding", () => {
  it("labels required issues as ERROR and others as WARN", () => {
    expect(
      formatFinding({ kind: "missing", key: "API_KEY", required: true }),
    ).toBe("ERROR  missing  API_KEY");
    expect(
      formatFinding({ kind: "unused", key: "DEBUG", required: false }),
    ).toBe("WARN  unused   DEBUG");
  });
});
