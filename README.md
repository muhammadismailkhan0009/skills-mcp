# skills-mcp

A lightweight MCP server for exposing reusable agent skills stored in public GitHub repositories.

## MCP tools

- `list_skills`
- `read_skill`
- `list_skill_resources`
- `read_skill_resource`

MCP transport is stdio only.

## Run

```bash
npx @myriadcode/skills-mcp
```

The process also starts a loopback-only management UI at:

```text
http://127.0.0.1:3218/
```

The UI is only for local repository management; it is not an HTTP MCP transport.
## Configuration

Repository configuration is persisted at:

```text
~/.skills-mcp/sources.json
```

Optional environment variables:

- `SKILLS_MCP_DATA_DIR` — override the data directory
- `SKILLS_MCP_UI_PORT` — override the management UI port; use `0` for an ephemeral port

V1 supports public GitHub repositories only.

## MCP client configuration

Example:

```json
{
  "mcpServers": {
    "skills": {
      "command": "npx",
      "args": ["-y", "@myriadcode/skills-mcp"]
    }
  }
}
```
## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

The test suite follows behavior-driven scenarios for repository discovery, source lifecycle, MCP tool behavior, UI behavior, and the stdio CLI entrypoint.

See [SPECIFICATIONS.md](./SPECIFICATIONS.md) for the V1 scope.
