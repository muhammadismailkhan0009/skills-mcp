import type { SkillCatalog } from "../skills/skill-catalog.js";
import type { SkillMetadata } from "../skills/types.js";
import type { SourceStore } from "../sources/source-store.js";
import type { SkillSource } from "../sources/types.js";

export class SkillsRuntime {
  constructor(
    private readonly store: SourceStore,
    private readonly catalog: SkillCatalog,
  ) {}

  async initialize(): Promise<void> {
    const sources = await this.store.list();

    for (const source of sources) {
      if (!source.enabled) continue;
      try {
        await this.catalog.refreshSource(source);
      } catch (error) {
        console.error(
          `Failed to refresh source "${source.id}":`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  listSources(): Promise<SkillSource[]> {
    return this.store.list();
  }

  listSkills(): SkillMetadata[] {
    return this.catalog.listSkills();
  }
  async addSource(source: SkillSource): Promise<void> {
    if ((await this.store.list()).some((item) => item.id === source.id)) {
      throw new Error(`Source already exists: ${source.id}`);
    }

    if (source.enabled) {
      await this.catalog.refreshSource(source);
    }

    try {
      await this.store.add(source);
    } catch (error) {
      this.catalog.removeSource(source.id);
      throw error;
    }
  }

  async removeSource(id: string): Promise<void> {
    await this.store.remove(id);
    this.catalog.removeSource(id);
  }

  async setSourceEnabled(id: string, enabled: boolean): Promise<void> {
    const source = await this.requireSource(id);

    if (enabled) {
      await this.catalog.refreshSource({ ...source, enabled: true });
      await this.store.setEnabled(id, true);
      return;
    }

    await this.store.setEnabled(id, false);
    this.catalog.removeSource(id);
  }
  async refreshSource(id: string): Promise<void> {
    const source = await this.requireSource(id);
    if (!source.enabled) return;
    await this.catalog.refreshSource(source);
  }

  async readSkill(id: string): Promise<string> {
    return this.catalog.readSkill(id);
  }

  listSkillResources(id: string): string[] {
    return this.catalog.listSkillResources(id);
  }

  async readSkillResource(id: string, resourcePath: string): Promise<string> {
    return this.catalog.readSkillResource(id, resourcePath);
  }

  private async requireSource(id: string): Promise<SkillSource> {
    const source = (await this.store.list()).find((item) => item.id === id);
    if (!source) throw new Error(`Unknown source: ${id}`);
    return source;
  }
}
