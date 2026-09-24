# skills-mcp — V1 Specification

## Purpose

`skills-mcp` is a lightweight, generic MCP server for exposing reusable agent skills stored in GitHub repositories.

A skill is any directory containing a `SKILL.md` file. Skills may also contain supporting resources such as references, scripts, assets, hooks, or arbitrary files.

The server must not contain CodeAssistant-specific behavior. It should be usable by any MCP client or registry.

## Technology

- TypeScript
- Node.js
- Official Model Context Protocol TypeScript SDK
- GitHub API for repository access
- Small built-in web UI for source management
- npm package with CLI executable

## Core Flow

```text
GitHub repositories
        ↓
recursive SKILL.md discovery
        ↓
skill index
        ↓
four generic MCP tools
        ↓
any MCP client
```
## Repository Sources

Repositories are configured through the web UI, not hardcoded in source code.

The user provides exactly one value when adding a source: a public GitHub repository URL, for example:

```text
https://github.com/muhammadismailkhan0009/dev-skills
```

The server normalizes that URL to `owner/repo` form and derives a collision-safe internal source ID automatically. For example:

```text
repository: muhammadismailkhan0009/dev-skills
internal source ID: muhammadismailkhan0009~dev-skills
```

The internal source ID is not a user-facing configuration field.

V1 uses the repository's default branch and supports public GitHub repositories only. Private-repository authentication and custom refs are intentionally out of scope.
## Skill Discovery

For every enabled repository, recursively inspect the repository tree for:

```text
**/SKILL.md
```

There must be no assumption about directory depth.

Examples that must all work:

```text
pdf/SKILL.md
backend/java/spring/spring-api/SKILL.md
frontend/nextjs/uiflow/SKILL.md
company/team/domain/some-skill/SKILL.md
```

The parent directory containing `SKILL.md` is the skill root.

## Skill Identity

Frontmatter names are not guaranteed to be globally unique.

The canonical skill ID must therefore combine the source ID and repository-relative skill path.

Example:

```text
muhammadismailkhan0009~dev-skills/backend/java/spring/spring-api
```

Each skill also exposes a derived `scope`. Scope is the parent path of the skill root and is never read from or written to `SKILL.md`.

Examples:

```text
path:  backend/java/feature-planning
scope: backend/java

path:  frontend/nextjs/feature-planning
scope: frontend/nextjs

path:  feature-planning
scope: ""
```

Duplicate skill names are valid. Clients must use the canonical ID for exact identity and may use `scope` to present or select the appropriate hierarchical context.

## Skill Structure

A typical skill may contain:

```text
spring-data-jpa/
├── SKILL.md
├── references/
│   ├── entity-mapping.md
│   └── repositories.md
├── scripts/
│   └── example.py
├── assets/
└── hooks/
```

`SKILL.md` is the only required file.

Every descendant file under the skill root, except `SKILL.md` itself, is treated as a skill resource. The server must not assign special semantics to folder names such as `references`, `scripts`, `assets`, or `hooks`.

## MCP Surface

V1 intentionally mirrors SkillServer's minimal skill-facing MCP API.

Exactly four MCP tools are required:

- `list_skills`
- `read_skill`
- `list_skill_resources`
- `read_skill_resource`
### list_skills

Lists all currently available skills.

Each result should include at least:

- canonical skill ID
- skill name
- description
- source ID
- repository-relative skill path
- derived hierarchical scope

The returned skill ID is used by the other MCP tools.

### read_skill

Reads and returns the complete `SKILL.md` content for one skill.

Input:

```json
{
  "id": "muhammadismailkhan0009~dev-skills/backend/java/spring/spring-api"
}
```

### list_skill_resources

Lists all resource files belonging to a skill.

Input:

```json
{
  "id": "muhammadismailkhan0009~dev-skills/backend/java/spring/spring-data-jpa"
}
```
Example result:

```text
references/entity-mapping.md
references/repositories.md
scripts/example.py
```

### read_skill_resource

Reads one resource file belonging to a skill.

Input:

```json
{
  "id": "muhammadismailkhan0009~dev-skills/backend/java/spring/spring-data-jpa",
  "path": "references/entity-mapping.md"
}
```

Resource paths must be normalized and must never be allowed to escape the discovered skill root.

## Web UI

V1 includes a small loopback-only React management UI built with standard shadcn/ui components. The UI uses local HTTP only for browser management; it is not an MCP HTTP transport. MCP clients continue to interact exclusively through stdio and the four tools above.

The default UI address is `http://127.0.0.1:3218/`. The port may be overridden with `SKILLS_MCP_UI_PORT`.

The UI should stay deliberately simple:

- one public GitHub repository URL input
- repository list
- remove repository
- enable/disable repository
- refresh repository
- view discovered skills inline
- inspect a skill and its resources

Users must not be asked to enter a source ID, `owner/repo` separately, or a Git ref.
## Persistence

V1 does not require a database.

Repository source configuration is stored outside the installed npm package at:

```text
~/.skills-mcp/sources.json
```

The base directory may be overridden with `SKILLS_MCP_DATA_DIR`.

Persistence remains isolated behind a small interface so it can later be replaced without changing the MCP API.

## Freshness and Caching

GitHub remains the source of truth.

The server should cache repository metadata, discovered skill metadata, and fetched file contents to avoid unnecessary GitHub API calls.

Repository commit/tree/blob SHAs should be used where practical to detect changes.

Refreshing a source should:

1. check the current repository revision
2. rescan the tree when it changed
3. add newly discovered skills
4. update changed skills
5. remove deleted skills

Refresh is an internal/UI operation in V1, not an MCP tool.
## MCP Transport

V1 supports stdio only.

`skills-mcp` is intended to run as a local MCP process and be connected to clients, adapters, or an MCP registry through standard input/output.

No HTTP transport is required in V1.

## Security

The server must:

- prevent path traversal in resource reads
- only read resource files under the selected skill root
- validate repository identifiers and refs
- handle missing, deleted, or inaccessible upstream files gracefully

## npm Distribution

The project must be configured for publication to npm.

It should provide a CLI executable so users can run:

```bash
npx @myriadcodelabs/skills-mcp
```

or, after installing the package globally:

```bash
skills-mcp
```

The package must contain only required runtime/build artifacts and must not depend on this development filesystem.
## Explicitly Out of Scope for V1

Do not implement:

- skill marketplace
- user accounts or organizations
- permissions system
- skill editing or Git commits
- native execution of skill scripts
- embeddings or vector search
- one-MCP-tool-per-skill exposure
- native MCP Skills extension
- runtime source-management MCP tools
- per-skill enable/disable policy
- analytics or complex version history

## Definition of Done

V1 is complete when a user can:

1. install or run `skills-mcp` through npm
2. start the server and open its web UI
3. add a GitHub repository without modifying source code
4. recursively discover every valid nested `SKILL.md`
5. browse discovered skills and resources in the UI
6. connect to the server through stdio
7. call `list_skills`
8. call `read_skill`
9. call `list_skill_resources`
10. call `read_skill_resource`
11. refresh a source after upstream GitHub changes and observe the updated skill index
