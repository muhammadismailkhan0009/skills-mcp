import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, expect, it } from "vitest";

function inheritedEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

describe("CLI behavior", () => {
  it("starts as a stdio MCP server with the four skill tools", async () => {
    const dataDirectory = await mkdtemp(
      path.join(os.tmpdir(), "skills-mcp-cli-"),
    );

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"),
        path.join(process.cwd(), "src/cli.ts"),
      ],
      cwd: process.cwd(),
      env: {
        ...inheritedEnvironment(),
        SKILLS_MCP_DATA_DIR: dataDirectory,
        SKILLS_MCP_UI_PORT: "0",
      },
      stderr: "pipe",
    });

    const client = new Client({
      name: "skills-mcp-cli-test",
      version: "1.0.0",
    });

    try {
      await client.connect(transport);
      const { tools } = await client.listTools();

      expect(tools.map((tool) => tool.name).sort()).toEqual([
        "list_skill_resources",
        "list_skills",
        "read_skill",
        "read_skill_resource",
      ]);
    } finally {
      await client.close();
    }
  });
});
