import path from "node:path";

import matter from "gray-matter";

import type { RepositoryReader } from "../sources/repository-reader.js";
import type { SkillSource } from "../sources/types.js";
import type { IndexedSkill, SkillMetadata } from "./types.js";

const POSIX = path.posix;

export class SkillCatalog {
  private readonly skills = new Map<string, IndexedSkill>();

  constructor(private readonly repositoryReader: RepositoryReader) {}

  async refreshSource(source: SkillSource): Promise<void> {
    for (const [id, skill] of this.skills) {
      if (skill.source.id === source.id) this.skills.delete(id);
    }

    if (!source.enabled) return;

    const files = (await this.repositoryReader.listFiles(source)).sort();
    const skillFiles = files.filter(
      (file) => file === "SKILL.md" || file.endsWith("/SKILL.md"),
    );
    const roots = skillFiles.map((file) => POSIX.dirname(file));

    for (const skillFilePath of skillFiles) {
      const root = POSIX.dirname(skillFilePath);
      const raw = await this.repositoryReader.readFile(source, skillFilePath);
      const parsed = matter(raw);
      const name =
        typeof parsed.data.name === "string" && parsed.data.name.trim()
          ? parsed.data.name.trim()
          : POSIX.basename(root);
      const description =
        typeof parsed.data.description === "string"
          ? parsed.data.description.trim()
          : "";

      const metadata: SkillMetadata = {
        id: `${source.id}/${root}`,
        name,
        description,
        sourceId: source.id,
        path: root,
      };

      const resourcePaths = files
        .filter((file) => this.isResourceOf(file, root, roots))
        .map((file) => POSIX.relative(root, file))
        .sort();

      this.skills.set(metadata.id, {
        metadata,
        source,
        skillFilePath,
        resourcePaths,
      });
    }
  }

  listSkills(): SkillMetadata[] {
    return [...this.skills.values()]
      .map((skill) => skill.metadata)
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  async readSkill(id: string): Promise<string> {
    const skill = this.requireSkill(id);
    return this.repositoryReader.readFile(skill.source, skill.skillFilePath);
  }

  listSkillResources(id: string): string[] {
    return [...this.requireSkill(id).resourcePaths];
  }

  async readSkillResource(id: string, resourcePath: string): Promise<string> {
    const skill = this.requireSkill(id);
    const normalized = this.normalizeResourcePath(resourcePath);

    if (!skill.resourcePaths.includes(normalized)) {
      throw new Error(`Resource not found in skill: ${resourcePath}`);
    }

    const repositoryPath = POSIX.join(skill.metadata.path, normalized);
    return this.repositoryReader.readFile(skill.source, repositoryPath);
  }

  private requireSkill(id: string): IndexedSkill {
    const skill = this.skills.get(id);
    if (!skill) throw new Error(`Unknown skill: ${id}`);
    return skill;
  }

  private normalizeResourcePath(resourcePath: string): string {
    if (!resourcePath || POSIX.isAbsolute(resourcePath)) {
      throw new Error("Invalid resource path");
    }
    const normalized = POSIX.normalize(resourcePath);
    if (
      normalized === ".." ||
      normalized.startsWith("../") ||
      normalized === "." ||
      normalized.includes("\\")
    ) {
      throw new Error("Invalid resource path");
    }

    return normalized;
  }

  private isResourceOf(
    file: string,
    skillRoot: string,
    allSkillRoots: string[],
  ): boolean {
    if (file === POSIX.join(skillRoot, "SKILL.md")) return false;
    if (!file.startsWith(`${skillRoot}/`)) return false;

    return !allSkillRoots.some(
      (otherRoot) =>
        otherRoot !== skillRoot && file.startsWith(`${otherRoot}/`),
    );
  }
}
