import { Octokit } from "@octokit/rest";

import type { RepositoryReader } from "./repository-reader.js";
import type { SkillSource } from "./types.js";

export interface GitHubTreeEntry {
  path: string;
  type: "blob" | "tree";
}

export interface GitHubApi {
  getRepository(owner: string, repo: string): Promise<{ defaultBranch: string }>;
  getCommit(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<{ sha: string; treeSha: string }>;
  getTree(owner: string, repo: string, treeSha: string): Promise<GitHubTreeEntry[]>;
  getFile(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<{ content: string; encoding: "base64" }>;
}

interface ResolvedSnapshot {
  revision: string;
  treeSha: string;
}
export class OctokitGitHubApi implements GitHubApi {
  private readonly octokit = new Octokit();

  async getRepository(owner: string, repo: string) {
    const { data } = await this.octokit.rest.repos.get({ owner, repo });
    return { defaultBranch: data.default_branch };
  }

  async getCommit(owner: string, repo: string, ref: string) {
    const { data } = await this.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref,
    });

    return {
      sha: data.sha,
      treeSha: data.commit.tree.sha,
    };
  }

  async getTree(owner: string, repo: string, treeSha: string) {
    const { data } = await this.octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: "true",
    });

    return data.tree.flatMap((entry) => {
      if (!entry.path || (entry.type !== "blob" && entry.type !== "tree")) {
        return [];
      }
      return [{
        path: entry.path,
        type: entry.type as "blob" | "tree",
      }];
    });
  }
  async getFile(owner: string, repo: string, path: string, ref: string) {
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (
      Array.isArray(data) ||
      data.type !== "file" ||
      !("content" in data) ||
      !("encoding" in data) ||
      data.encoding !== "base64"
    ) {
      throw new Error(`GitHub path is not a readable file: ${path}`);
    }

    return {
      content: data.content.replace(/\n/g, ""),
      encoding: "base64" as const,
    };
  }
}

export class GitHubRepositoryReader implements RepositoryReader {
  private readonly snapshots = new Map<string, ResolvedSnapshot>();

  constructor(private readonly api: GitHubApi = new OctokitGitHubApi()) {}

  async getRevision(source: SkillSource): Promise<string> {
    return (await this.resolveSnapshot(source)).revision;
  }

  async listFiles(source: SkillSource): Promise<string[]> {
    const { owner, repo } = this.parseRepository(source.repository);
    const snapshot = await this.resolveSnapshot(source);
    const tree = await this.api.getTree(owner, repo, snapshot.treeSha);

    return tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => entry.path)
      .sort();
  }

  async readFile(source: SkillSource, path: string): Promise<string> {
    const { owner, repo } = this.parseRepository(source.repository);
    const key = this.sourceKey(source);
    const snapshot =
      this.snapshots.get(key) ?? (await this.resolveSnapshot(source));
    const file = await this.api.getFile(
      owner,
      repo,
      path,
      snapshot.revision,
    );

    return Buffer.from(file.content, "base64").toString("utf8");
  }

  private async resolveSnapshot(
    source: SkillSource,
  ): Promise<ResolvedSnapshot> {
    const { owner, repo } = this.parseRepository(source.repository);
    const ref =
      source.ref ??
      (await this.api.getRepository(owner, repo)).defaultBranch;
    const commit = await this.api.getCommit(owner, repo, ref);
    const snapshot = {
      revision: commit.sha,
      treeSha: commit.treeSha,
    };

    this.snapshots.set(this.sourceKey(source), snapshot);
    return snapshot;
  }
  private sourceKey(source: SkillSource): string {
    return `${source.id}\0${source.repository}\0${source.ref ?? ""}`;
  }

  private parseRepository(repository: string): {
    owner: string;
    repo: string;
  } {
    const match = /^([^/\s]+)\/([^/\s]+)$/.exec(repository.trim());
    if (!match?.[1] || !match[2]) {
      throw new Error(
        `Invalid GitHub repository "${repository}"; expected owner/repo`,
      );
    }

    return {
      owner: match[1],
      repo: match[2],
    };
  }
}
