import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EnvFileError, loadEnvFiles } from "../src/loadEnvFiles.js";

describe("loadEnvFiles", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "envlens-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("reads and parses both files", async () => {
    await fs.writeFile(
      path.join(tempDir, ".env.example"),
      "PORT=3000\n# optional\nREDIS_URL=\n",
    );
    await fs.writeFile(path.join(tempDir, ".env"), "PORT=4000\nREDIS_URL=redis://localhost\n");

    const loaded = await loadEnvFiles({
      dir: tempDir,
      exampleFile: ".env.example",
      envFile: ".env",
    });

    expect(loaded.envFileExists).toBe(true);
    expect(loaded.example.map.PORT).toEqual({ value: "3000", optional: false });
    expect(loaded.example.map.REDIS_URL).toEqual({ value: "", optional: true });
    expect(loaded.actual.map.PORT).toEqual({
      value: "4000",
      optional: false,
    });
    expect(loaded.example.issues).toHaveLength(0);
    expect(loaded.actual.issues).toHaveLength(0);
  });

  it("treats a missing .env as an empty map (fresh clone)", async () => {
    await fs.writeFile(path.join(tempDir, ".env.example"), "API_KEY=\nPORT=1\n");

    const loaded = await loadEnvFiles({
      dir: tempDir,
      exampleFile: ".env.example",
      envFile: ".env",
    });

    expect(loaded.envFileExists).toBe(false);
    expect(loaded.actual.map).toEqual({});
    expect(Object.keys(loaded.example.map)).toEqual(["API_KEY", "PORT"]);
  });

  it("throws when .env.example is missing", async () => {
    await expect(
      loadEnvFiles({
        dir: tempDir,
        exampleFile: ".env.example",
        envFile: ".env",
      }),
    ).rejects.toMatchObject({
      name: "EnvFileError",
      code: "example_not_found",
    });

    try {
      await loadEnvFiles({
        dir: tempDir,
        exampleFile: ".env.example",
        envFile: ".env",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvFileError);
      if (error instanceof EnvFileError) {
        expect(error.message).toContain(".env.example");
      }
    }
  });

  it("does not put secret file values into thrown errors", async () => {
    const secret = "super-secret-token";
    await fs.writeFile(path.join(tempDir, ".env.example"), `API_KEY=${secret}\n`);
    await fs.writeFile(path.join(tempDir, ".env"), `API_KEY=${secret}\n`);

    const loaded = await loadEnvFiles({
      dir: tempDir,
      exampleFile: ".env.example",
      envFile: ".env",
    });

    expect(loaded.actual.map.API_KEY?.value).toBe(secret);
    expect(loaded.examplePath).not.toContain(secret);
    expect(loaded.envPath).not.toContain(secret);
  });
});
