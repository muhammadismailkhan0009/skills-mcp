import { describe, expect, it } from "vitest";

import {
  GitHubRepositoryReader,
  type GitHubApi,
} from "../src/sources/github-repository-reader.js";
import type { SkillSource } from "../src/sources/types.js";

class FakeGitHubApi implements GitHubApi {
  readonly fileRefs: string[] = [];

  async getRepository() {
    return { defaultBranch: "main" };
  }

  async getCommit(_owner: string, _repo: string, ref: string) {
    expect(ref).toBe("main");
    return { sha: "commit-123", treeSha: "tree-123" };
  }

  async getTree() {
    return [
      { path: "backend", type: "tree" as const },
      { path: "backend/api/SKILL.md", type: "blob" as const },
      { path: "backend/api/references/errors.md", type: "blob" as const },
    ];
  }

  async getFile(
    _owner: string,
    _repo: string,
    _path: string,
    ref: string,
  ) {
    this.fileRefs.push(ref);
    return {
      content: Buffer.from("# Skill").toString("base64"),
      encoding: "base64" as const,
    };
  }
}

const source: SkillSource = {
  id: "public-skills",
  repository: "example/skills",
  enabled: true,
};

describe("GitHub repository reader behavior", () => {
  it("discovers public repository files recursively using its default branch", async () => {
    // Given a public GitHub source without an explicit ref
    const api = new FakeGitHubApi();
    const reader = new GitHubRepositoryReader(api);

    // When its repository files are listed
    const files = await reader.listFiles(source);

    // Then only files are returned from the recursive Git tree
    expect(files).toEqual([
      "backend/api/SKILL.md",
      "backend/api/references/errors.md",
    ]);
    await expect(reader.getRevision(source)).resolves.toBe("commit-123");
  });

  it("reads files from the commit resolved for the current repository snapshot", async () => {
    const api = new FakeGitHubApi();
    const reader = new GitHubRepositoryReader(api);
    await reader.listFiles(source);

    const content = await reader.readFile(source, "backend/api/SKILL.md");

    expect(content).toBe("# Skill");
    expect(api.fileRefs).toEqual(["commit-123"]);
  });

  it("rejects malformed GitHub repository identifiers", async () => {
    const reader = new GitHubRepositoryReader(new FakeGitHubApi());

    await expect(
      reader.listFiles({
        ...source,
        repository: "not-a-valid-repository",
      }),
    ).rejects.toThrow(/owner\/repo/i);
  });
});
