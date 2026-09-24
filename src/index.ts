export const SKILLS_MCP_NAME = "skills-mcp";
export const SKILLS_MCP_VERSION = "0.1.0";

export { createSkillsMcpServer } from "./mcp/server.js";
export { SkillsRuntime } from "./runtime/skills-runtime.js";
export { SkillCatalog } from "./skills/skill-catalog.js";
export { GitHubRepositoryReader } from "./sources/github-repository-reader.js";
export { SourceStore } from "./sources/source-store.js";
export type { SkillSource } from "./sources/types.js";
export type { SkillMetadata } from "./skills/types.js";
