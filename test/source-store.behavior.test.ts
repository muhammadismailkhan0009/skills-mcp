import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SourceStore } from "../src/sources/source-store.js";

async function createStore() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "skills-mcp-"));
  return {
    file: path.join(dir, "sources.json"),
    store: new SourceStore(path.join(dir, "sources.json")),
  };
}

describe("repository source management behavior", () => {
  it("persists a newly added public GitHub source", async () => {
    // Given a fresh skills-mcp configuration
    const { file, store } = await createStore();

    // When a repository is added
    await store.add({
      id: "dev-skills",
      repository: "example/dev-skills",
      ref: "main",
      enabled: true,
    });

    // Then a new process can load the same source
    const reloaded = new SourceStore(file);
    expect(await reloaded.list()).toEqual([
      {
        id: "dev-skills",
        repository: "example/dev-skills",
        ref: "main",
        enabled: true,
      },
    ]);
  });

  it("rejects duplicate source IDs", async () => {
    const { store } = await createStore();
    await store.add({
      id: "dev-skills",
      repository: "example/one",
      enabled: true,
    });

    await expect(
      store.add({
        id: "dev-skills",
        repository: "example/two",
        enabled: true,
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it("can disable, re-enable, and remove a source", async () => {
    const { store } = await createStore();
    await store.add({
      id: "dev-skills",
      repository: "example/dev-skills",
      enabled: true,
    });

    await store.setEnabled("dev-skills", false);
    expect((await store.list())[0]?.enabled).toBe(false);

    await store.setEnabled("dev-skills", true);
    expect((await store.list())[0]?.enabled).toBe(true);

    await store.remove("dev-skills");
    expect(await store.list()).toEqual([]);
  });
});
