import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SkillsRuntime } from "../src/runtime/skills-runtime.js";
import { SkillCatalog } from "../src/skills/skill-catalog.js";
import type { RepositoryReader } from "../src/sources/repository-reader.js";
import { SourceStore } from "../src/sources/source-store.js";
import type { SkillSource } from "../src/sources/types.js";
import {
  startManagementUi,
  type ManagementUiHandle,
} from "../src/ui/server.js";

class FakeReader implements RepositoryReader {
  async getRevision() {
    return "revision-1";
  }

  async listFiles() {
    return [
      "nested/demo/SKILL.md",
      "nested/demo/references/guide.md",
    ];
  }

  async readFile(_source: SkillSource, filePath: string) {
    if (filePath.endsWith("SKILL.md")) {
      return "---\nname: demo\ndescription: Demo skill\n---\n# Demo";
    }
    return "# Guide";
  }
}

async function createUi() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "skills-mcp-ui-"));
  const staticDirectory = path.join(dir, "web");
  await mkdir(staticDirectory, { recursive: true });
  await writeFile(
    path.join(staticDirectory, "index.html"),
    "<!doctype html><title>skills-mcp</title><div>skills-mcp</div>",
    "utf8",
  );

  const store = new SourceStore(path.join(dir, "sources.json"));
  const catalog = new SkillCatalog(new FakeReader());
  const runtime = new SkillsRuntime(store, catalog);
  const ui = await startManagementUi(runtime, {
    port: 0,
    staticDirectory,
  });
  return { runtime, ui };
}

describe("management UI behavior", () => {
  let ui: ManagementUiHandle | undefined;

  afterEach(async () => {
    await ui?.close();
    ui = undefined;
  });

  it("serves a local management page", async () => {
    const created = await createUi();
    ui = created.ui;

    const response = await fetch(ui.url);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("skills-mcp");
  });

  it("adds a repository and makes its skills visible through the API", async () => {
    const created = await createUi();
    ui = created.ui;

    const added = await fetch(`${ui.url}api/sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://github.com/example/skills",
      }),
    });

    expect(added.status).toBe(201);

    const sources = await fetch(`${ui.url}api/sources`).then((res) =>
      res.json(),
    );
    expect(sources).toEqual([
      {
        id: "example~skills",
        repository: "example/skills",
        enabled: true,
      },
    ]);

    const skills = await fetch(
      `${ui.url}api/skills?source=example~skills`,
    ).then((res) => res.json());

    expect(skills).toEqual([
      expect.objectContaining({
        id: "example~skills/nested/demo",
        name: "demo",
      }),
    ]);
  });

  it("can disable a repository through the API", async () => {
    const created = await createUi();
    ui = created.ui;
    await created.runtime.addSource({
      id: "demo",
      repository: "example/skills",
      enabled: true,
    });

    const response = await fetch(`${ui.url}api/sources/demo`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });

    expect(response.status).toBe(200);
    expect(created.runtime.listSkills()).toEqual([]);
  });
});
