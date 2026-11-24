import { describe, it, expect } from "vitest";
import { parseEnv } from "../src/parseEnv.js";

describe("parseEnv", () => {
  it("parses basic keys and optional comment", () => {
    const { map, issues } = parseEnv(
      "PORT=3000\n# optional\nREDIS_URL=\n"
    );
    expect(issues).toHaveLength(0);
    expect(map.PORT).toEqual({ value: "3000", optional: false });
    expect(map.REDIS_URL).toEqual({ value: "", optional: true });
  });

  it("reports invalid and duplicate keys without leaking values", () => {
    const secret = "super-secret-token";
    const { map, issues } = parseEnv(
      `FOO=${secret}\nFOO=other\nnot-a-valid-line\n`
    );
    expect(map.FOO?.value).toBe("other");
    expect(issues.map((i) => i.kind)).toContain("duplicate_key");
    expect(issues.map((i) => i.kind)).toContain("invalid_line");
    expect(JSON.stringify(issues)).not.toContain(secret);
  });
});
