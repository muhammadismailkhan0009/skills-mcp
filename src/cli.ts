#!/usr/bin/env node

import { SKILLS_MCP_NAME, SKILLS_MCP_VERSION } from "./index.js";

// stdio MCP servers must keep stdout reserved for protocol messages.
console.error(
  `${SKILLS_MCP_NAME} v${SKILLS_MCP_VERSION}: project scaffold initialized; MCP server implementation pending.`,
);
