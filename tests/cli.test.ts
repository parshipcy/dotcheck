import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCli } from "../src/cli.js";

describe("runCli", () => {
  let tempDir: string;
  const logs: string[] = [];
  const errors: string[] = [];
  const io = {
    log: (message: string) => logs.push(message),
    error: (message: string) => errors.push(message),
  };

  beforeEach(async () => {
    logs.length = 0;
    errors.length = 0;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dotcheck-cli-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("prints help and exits 0", async () => {
    const code = await runCli(["--help"], io);
    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("Usage: dotcheck");
  });

  it("exits 0 when configuration is valid", async () => {
    await fs.writeFile(path.join(tempDir, ".env.example"), "PORT=3000\n");
    await fs.writeFile(path.join(tempDir, ".env"), "PORT=4000\n");

    const code = await runCli(["--dir", tempDir], io);
    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("look good");
  });

  it("exits 1 on missing required keys and never prints values", async () => {
    const secret = "super-secret-token";
    await fs.writeFile(path.join(tempDir, ".env.example"), "API_KEY=\n");
    await fs.writeFile(path.join(tempDir, ".env"), `LEAK=${secret}\n`);

    const code = await runCli(["--dir", tempDir], io);
    const output = [...logs, ...errors].join("\n");

    expect(code).toBe(1);
    expect(output).toContain("API_KEY");
    expect(output).toContain("LEAK");
    expect(output).not.toContain(secret);
  });

  it("exits 2 when .env.example is missing", async () => {
    const code = await runCli(["--dir", tempDir], io);
    expect(code).toBe(2);
    expect(errors.join("\n")).toContain(".env.example");
  });

  it("exits 2 on usage errors", async () => {
    const code = await runCli(["--unknown"], io);
    expect(code).toBe(2);
    expect(errors.join("\n")).toContain("Unknown option");
  });
});