import { describe, expect, it } from "vitest";

import { SkillCatalog } from "../src/skills/skill-catalog.js";
import type { RepositoryReader } from "../src/sources/repository-reader.js";
import type { SkillSource } from "../src/sources/types.js";

const source: SkillSource = {
  id: "dev-skills",
  repository: "example/dev-skills",
  ref: "main",
  enabled: true,
};

class FakeRepositoryReader implements RepositoryReader {
  constructor(
    private readonly files: Record<string, string>,
  ) {}

  async getRevision(): Promise<string> {
    return "revision-1";
  }

  async listFiles(): Promise<string[]> {
    return Object.keys(this.files);
  }

  async readFile(_source: SkillSource, path: string): Promise<string> {
    const content = this.files[path];
    if (content === undefined) throw new Error(`Missing fixture: ${path}`);
    return content;
  }
}

function createCatalog() {
  const reader = new FakeRepositoryReader({
    "backend/java/spring/api/SKILL.md":
      "---\nname: spring-api\ndescription: Build Spring APIs\n---\n# API\nUse controllers.",
    "backend/java/spring/api/references/errors.md": "# Errors",
    "backend/java/testing/SKILL.md":
      "---\nname: testing\ndescription: Test Java services\n---\n# Testing",
    "frontend/testing/SKILL.md":
      "---\nname: testing\ndescription: Test frontend apps\n---\n# Frontend testing",
    "README.md": "# Repository",
  });

  return new SkillCatalog(reader);
}

describe("skill catalog behavior", () => {
  it("discovers skills recursively and preserves unique path-based IDs", async () => {
    // Given a repository with deeply nested skills and duplicate display names
    const catalog = createCatalog();

    // When the source is refreshed
    await catalog.refreshSource(source);
    const skills = catalog.listSkills();

    // Then every nested SKILL.md is discoverable without name collisions
    expect(skills.map((skill) => skill.id)).toEqual([
      "dev-skills/backend/java/spring/api",
      "dev-skills/backend/java/testing",
      "dev-skills/frontend/testing",
    ]);
    expect(skills.filter((skill) => skill.name === "testing")).toHaveLength(2);
  });

  it("reads the complete SKILL.md for a discovered skill", async () => {
    const catalog = createCatalog();
    await catalog.refreshSource(source);

    const content = await catalog.readSkill(
      "dev-skills/backend/java/spring/api",
    );

    expect(content).toContain("# API");
    expect(content).toContain("Use controllers.");
  });

  it("lists and reads resources belonging to one skill", async () => {
    const catalog = createCatalog();
    await catalog.refreshSource(source);

    const resources = catalog.listSkillResources(
      "dev-skills/backend/java/spring/api",
    );

    expect(resources).toEqual(["references/errors.md"]);
    await expect(
      catalog.readSkillResource(
        "dev-skills/backend/java/spring/api",
        "references/errors.md",
      ),
    ).resolves.toBe("# Errors");
  });

  it("rejects resource paths that escape the skill root", async () => {
    const catalog = createCatalog();
    await catalog.refreshSource(source);

    await expect(
      catalog.readSkillResource(
        "dev-skills/backend/java/spring/api",
        "../testing/SKILL.md",
      ),
    ).rejects.toThrow(/invalid resource path/i);
  });
});
