import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createSkillsMcpServer } from "../src/mcp/server.js";
import { SkillCatalog } from "../src/skills/skill-catalog.js";
import type { RepositoryReader } from "../src/sources/repository-reader.js";
import type { SkillSource } from "../src/sources/types.js";

const source: SkillSource = {
  id: "dev-skills",
  repository: "example/dev-skills",
  enabled: true,
};

class FakeReader implements RepositoryReader {
  async getRevision() {
    return "revision-1";
  }

  async listFiles() {
    return [
      "backend/api/SKILL.md",
      "backend/api/references/errors.md",
    ];
  }

  async readFile(_source: SkillSource, path: string) {
    if (path === "backend/api/SKILL.md") {
      return "---\nname: spring-api\ndescription: Build APIs\n---\n# Spring API";
    }
    if (path === "backend/api/references/errors.md") {
      return "# Error handling";
    }
    throw new Error(`Unexpected path: ${path}`);
  }
}

describe("MCP skill tools behavior", () => {
  let client: Client;
  let closeServer: () => Promise<void>;

  beforeEach(async () => {
    const catalog = new SkillCatalog(new FakeReader());
    await catalog.refreshSource(source);

    const server = createSkillsMcpServer(catalog);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    client = new Client({
      name: "skills-mcp-behavior-test",
      version: "1.0.0",
    });
    await client.connect(clientTransport);

    closeServer = () => server.close();
  });

  afterEach(async () => {
    await client.close();
    await closeServer();
  });

  it("exposes exactly the four agreed skill tools", async () => {
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "list_skill_resources",
      "list_skills",
      "read_skill",
      "read_skill_resource",
    ]);
  });

  it("lists skills and reads the selected skill", async () => {
    const listed = await client.callTool({
      name: "list_skills",
      arguments: {},
    });
    const listText = listed.content[0];
    expect(listText?.type).toBe("text");
    if (listText?.type !== "text") throw new Error("Expected text result");
    expect(listText.text).toContain("dev-skills/backend/api");
    const listedSkills = JSON.parse(listText.text) as Array<{
      id: string;
      scope: string;
    }>;
    expect(listedSkills).toContainEqual(
      expect.objectContaining({
        id: "dev-skills/backend/api",
        scope: "backend",
      }),
    );

    const read = await client.callTool({
      name: "read_skill",
      arguments: { id: "dev-skills/backend/api" },
    });
    const readText = read.content[0];
    expect(readText?.type).toBe("text");
    if (readText?.type !== "text") throw new Error("Expected text result");
    expect(readText.text).toContain("# Spring API");
  });

  it("lists and reads a skill resource", async () => {
    const listed = await client.callTool({
      name: "list_skill_resources",
      arguments: { id: "dev-skills/backend/api" },
    });
    const listText = listed.content[0];
    if (listText?.type !== "text") throw new Error("Expected text result");
    expect(listText.text).toContain("references/errors.md");

    const read = await client.callTool({
      name: "read_skill_resource",
      arguments: {
        id: "dev-skills/backend/api",
        path: "references/errors.md",
      },
    });
    const readText = read.content[0];
    if (readText?.type !== "text") throw new Error("Expected text result");
    expect(readText.text).toBe("# Error handling");
  });
});
