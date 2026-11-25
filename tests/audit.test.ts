import { describe, it, expect } from "vitest";
import { audit } from "../src/audit.js";
import { parseEnv } from "../src/parseEnv.js";

describe("audit", () => {
  it("passes when every expected key is present and non-empty", () => {
    const expected = parseEnv("PORT=3000\nAPI_KEY=\n").map;
    const actual = parseEnv("PORT=3000\nAPI_KEY=abc\n").map;
    const result = audit(expected, actual);

    expect(result.findings).toHaveLength(0);
    expect(result.ok).toBe(true);
    expect(result.stats).toEqual({
      expectedKeys: 2,
      actualKeys: 2,
      optionalExpected: 0,
    });
  });

  it("reports missing required keys and fails", () => {
    const expected = parseEnv("PORT=3000\nAPI_KEY=\n").map;
    const actual = parseEnv("PORT=3000\n").map;
    const result = audit(expected, actual);

    expect(result.findings).toEqual([
      { kind: "missing", key: "API_KEY", required: true },
    ]);
    expect(result.ok).toBe(false);
  });

  it("reports empty required keys and fails", () => {
    const expected = parseEnv("API_KEY=\n").map;
    const actual = parseEnv("API_KEY=\n").map;
    const result = audit(expected, actual);

    expect(result.findings).toEqual([
      { kind: "empty", key: "API_KEY", required: true },
    ]);
    expect(result.ok).toBe(false);
  });

  it("treats optional empty or missing as warnings that do not fail", () => {
    const expected = parseEnv("# optional\nREDIS_URL=\nPORT=3000\n").map;
    const actual = parseEnv("PORT=3000\nREDIS_URL=\n").map;
    const result = audit(expected, actual);

    expect(result.findings).toEqual([
      { kind: "empty", key: "REDIS_URL", required: false },
    ]);
    expect(result.ok).toBe(true);
    expect(result.stats.optionalExpected).toBe(1);

    const missingOptional = audit(
      parseEnv("# optional\nREDIS_URL=\nPORT=1\n").map,
      parseEnv("PORT=1\n").map,
    );
    expect(missingOptional.findings).toEqual([
      { kind: "missing", key: "REDIS_URL", required: false },
    ]);
    expect(missingOptional.ok).toBe(true);
  });

  it("reports unused keys as warnings that do not fail", () => {
    const expected = parseEnv("PORT=3000\n").map;
    const actual = parseEnv("PORT=3000\nEXTRA=true\nDEBUG=1\n").map;
    const result = audit(expected, actual);

    expect(result.findings).toEqual([
      { kind: "unused", key: "DEBUG", required: false },
      { kind: "unused", key: "EXTRA", required: false },
    ]);
    expect(result.ok).toBe(true);
  });

  it("fails unused and optional issues when strict is true", () => {
    const expected = parseEnv("# optional\nREDIS_URL=\n").map;
    const actual = parseEnv("EXTRA=1\n").map;
    const result = audit(expected, actual, { strict: true });

    expect(result.findings.map((f) => f.kind).sort()).toEqual([
      "missing",
      "unused",
    ]);
    expect(result.ok).toBe(false);
  });

  it("never puts secret values into findings", () => {
    const secret = "super-secret-token";
    const expected = parseEnv("PORT=3000\n").map;
    const actual = parseEnv(`PORT=3000\nLEAK=${secret}\n`).map;
    const result = audit(expected, actual);

    expect(JSON.stringify(result.findings)).not.toContain(secret);
    expect(result.findings).toEqual([
      { kind: "unused", key: "LEAK", required: false },
    ]);
  });
});
