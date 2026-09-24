import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import type { SkillCatalog } from "../skills/skill-catalog.js";
import { SKILLS_MCP_NAME, SKILLS_MCP_VERSION } from "../index.js";

function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
}

export function createSkillsMcpServer(catalog: SkillCatalog): McpServer {
  const server = new McpServer({
    name: SKILLS_MCP_NAME,
    version: SKILLS_MCP_VERSION,
  });

  server.registerTool(
    "list_skills",
    {
      description: "List all available skills and their canonical IDs.",
      inputSchema: z.object({}),
    },
    async () => textResult(JSON.stringify(catalog.listSkills(), null, 2)),
  );

  server.registerTool(
    "read_skill",
    {
      description: "Read the complete SKILL.md content for a skill ID.",
      inputSchema: z.object({
        id: z.string().min(1).describe("Canonical skill ID"),
      }),
    },
    async ({ id }) => textResult(await catalog.readSkill(id)),
  );

  server.registerTool(
    "list_skill_resources",
    {
      description:
        "List resource files such as references, scripts, and assets for a skill.",
      inputSchema: z.object({
        id: z.string().min(1).describe("Canonical skill ID"),
      }),
    },
    async ({ id }) =>
      textResult(JSON.stringify(catalog.listSkillResources(id), null, 2)),
  );

  server.registerTool(
    "read_skill_resource",
    {
      description: "Read one resource file belonging to a skill.",
      inputSchema: z.object({
        id: z.string().min(1).describe("Canonical skill ID"),
        path: z.string().min(1).describe("Resource path relative to skill root"),
      }),
    },
    async ({ id, path }) =>
      textResult(await catalog.readSkillResource(id, path)),
  );

  return server;
}
