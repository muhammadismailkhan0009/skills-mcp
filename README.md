# skills-mcp

A lightweight MCP server for exposing reusable agent skills stored in GitHub repositories.

## Status

V1 is under development. The planned MCP surface is intentionally small:

- `list_skills`
- `read_skill`
- `list_skill_resources`
- `read_skill_resource`

The server will use stdio transport and include a small local web UI for managing GitHub skill repositories.

See [SPECIFICATIONS.md](./SPECIFICATIONS.md) for the V1 scope.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```
