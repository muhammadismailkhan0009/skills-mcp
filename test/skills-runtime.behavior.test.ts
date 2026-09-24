import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SkillsRuntime } from "../src/runtime/skills-runtime.js";
import { SkillCatalog } from "../src/skills/skill-catalog.js";
import type { RepositoryReader } from "../src/sources/repository-reader.js";
import { SourceStore } from "../src/sources/source-store.js";
import type { SkillSource } from "../src/sources/types.js";

class FakeReader implements RepositoryReader {
  async getRevision() {
    return "revision-1";
  }

  async listFiles(source: SkillSource) {
    if (source.repository === "example/broken") {
      throw new Error("Repository unavailable");
    }
    return ["nested/demo/SKILL.md"];
  }

  async readFile() {
    return "---\nname: demo\ndescription: Demo skill\n---\n# Demo";
  }
}

async function createRuntime() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "skills-mcp-runtime-"));
  const store = new SourceStore(path.join(dir, "sources.json"));
  const catalog = new SkillCatalog(new FakeReader());
  return {
    store,
    catalog,
    runtime: new SkillsRuntime(store, catalog),
  };
}

describe("skills runtime behavior", () => {
  it("adds a reachable repository and exposes its discovered skills", async () => {
    const { runtime, store } = await createRuntime();

    await runtime.addSource({
      id: "demo",
      repository: "example/skills",
      enabled: true,
    });

    expect((await store.list()).map((source) => source.id)).toEqual(["demo"]);
    expect(runtime.listSkills().map((skill) => skill.id)).toEqual([
      "demo/nested/demo",
    ]);
  });

  it("does not persist a repository that cannot be refreshed", async () => {
    const { runtime, store } = await createRuntime();

    await expect(
      runtime.addSource({
        id: "broken",
        repository: "example/broken",
        enabled: true,
      }),
    ).rejects.toThrow("Repository unavailable");

    expect(await store.list()).toEqual([]);
  });

  it("disabling and removing a source removes its skills", async () => {
    const { runtime } = await createRuntime();
    await runtime.addSource({
      id: "demo",
      repository: "example/skills",
      enabled: true,
    });

    await runtime.setSourceEnabled("demo", false);
    expect(runtime.listSkills()).toEqual([]);

    await runtime.setSourceEnabled("demo", true);
    expect(runtime.listSkills()).toHaveLength(1);

    await runtime.removeSource("demo");
    expect(runtime.listSkills()).toEqual([]);
    expect(await runtime.listSources()).toEqual([]);
  });
});
