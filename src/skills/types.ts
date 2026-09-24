import type { SkillSource } from "../sources/types.js";

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  sourceId: string;
  path: string;
  scope: string;
}

export interface IndexedSkill {
  metadata: SkillMetadata;
  source: SkillSource;
  skillFilePath: string;
  resourcePaths: string[];
}
