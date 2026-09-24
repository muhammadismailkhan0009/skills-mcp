import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SkillSource } from "./types.js";

interface StoredConfig {
  sources: SkillSource[];
}

export class SourceStore {
  constructor(private readonly configPath: string) {}

  async list(): Promise<SkillSource[]> {
    const config = await this.readConfig();
    return [...config.sources].sort((a, b) => a.id.localeCompare(b.id));
  }

  async add(source: SkillSource): Promise<void> {
    this.validateSource(source);
    const config = await this.readConfig();

    if (config.sources.some((item) => item.id === source.id)) {
      throw new Error(`Source already exists: ${source.id}`);
    }

    config.sources.push({ ...source });
    await this.writeConfig(config);
  }

  async remove(id: string): Promise<void> {
    const config = await this.readConfig();
    const next = config.sources.filter((source) => source.id !== id);
    if (next.length === config.sources.length) {
      throw new Error(`Unknown source: ${id}`);
    }

    await this.writeConfig({ sources: next });
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const config = await this.readConfig();
    const source = config.sources.find((item) => item.id === id);

    if (!source) throw new Error(`Unknown source: ${id}`);

    source.enabled = enabled;
    await this.writeConfig(config);
  }

  private async readConfig(): Promise<StoredConfig> {
    try {
      const raw = await readFile(this.configPath, "utf8");
      const parsed: unknown = JSON.parse(raw);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !Array.isArray((parsed as StoredConfig).sources)
      ) {
        throw new Error("Invalid skills-mcp source configuration");
      }

      return parsed as StoredConfig;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return { sources: [] };
      }
      throw error;
    }
  }
  private async writeConfig(config: StoredConfig): Promise<void> {
    const directory = path.dirname(this.configPath);
    await mkdir(directory, { recursive: true });

    const temporaryPath = `${this.configPath}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(config, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.configPath);
  }

  private validateSource(source: SkillSource): void {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(source.id)) {
      throw new Error(
        "Source ID must contain only letters, numbers, dots, underscores, and hyphens",
      );
    }

    if (!/^[^/\s]+\/[^/\s]+$/.test(source.repository)) {
      throw new Error("Repository must use owner/repo format");
    }

    if (source.ref !== undefined && source.ref.trim() === "") {
      throw new Error("Repository ref cannot be empty");
    }
  }
}
