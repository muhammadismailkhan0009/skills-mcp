import type { SkillSource } from "./types.js";

export interface RepositoryReader {
  getRevision(source: SkillSource): Promise<string>;
  listFiles(source: SkillSource): Promise<string[]>;
  readFile(source: SkillSource, path: string): Promise<string>;
}
