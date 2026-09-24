import { describe, expect, it } from "vitest";

import { SKILLS_MCP_NAME } from "../src/index.js";

describe("skills-mcp", () => {
  it("exports the package name", () => {
    expect(SKILLS_MCP_NAME).toBe("skills-mcp");
  });
});
