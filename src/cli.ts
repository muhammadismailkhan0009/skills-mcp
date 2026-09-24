#!/usr/bin/env node

import os from "node:os";
import path from "node:path";

import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { createSkillsMcpServer } from "./mcp/server.js";
import { SkillsRuntime } from "./runtime/skills-runtime.js";
import { SkillCatalog } from "./skills/skill-catalog.js";
import { GitHubRepositoryReader } from "./sources/github-repository-reader.js";
import { SourceStore } from "./sources/source-store.js";
import { startManagementUi } from "./ui/server.js";

const dataDirectory =
  process.env.SKILLS_MCP_DATA_DIR ??
  path.join(os.homedir(), ".skills-mcp");
const uiPort = parsePort(process.env.SKILLS_MCP_UI_PORT);

const store = new SourceStore(path.join(dataDirectory, "sources.json"));
const catalog = new SkillCatalog(new GitHubRepositoryReader());
const runtime = new SkillsRuntime(store, catalog);

await runtime.initialize();

const ui = await startManagementUi(runtime, { port: uiPort });
console.error(`skills-mcp management UI: ${ui.url}`);

const mcpServer = createSkillsMcpServer(catalog);
const transport = new StdioServerTransport();

let shuttingDown = false;
async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  await Promise.allSettled([
    ui.close(),
    mcpServer.close(),
  ]);
}

process.stdin.once("end", () => {
  void ui.close();
});
process.once("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});
process.once("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

await mcpServer.connect(transport);

function parsePort(value: string | undefined): number {
  if (value === undefined) return 3218;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("SKILLS_MCP_UI_PORT must be an integer between 0 and 65535");
  }
  return port;
}
