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
npx @myriadcodelabs/skills-mcp
```

The process also starts a loopback-only management UI at:

```text
http://127.0.0.1:3218/
```

The UI is only for local repository management; it is not an HTTP MCP transport. It is a small React interface built with standard shadcn/ui components.

To add a source, paste only the public GitHub repository URL, for example:

```text
https://github.com/muhammadismailkhan0009/dev-skills
```

The server derives its internal source identity automatically and uses the repository's default branch.
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
      "args": ["-y", "@myriadcodelabs/skills-mcp"]
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
## Publishing and releases

Source repository:

```text
https://github.com/muhammadismailkhan0009/skills-mcp
```

npm package:

```text
@myriadcodelabs/skills-mcp
```

The repository includes:

- `.github/workflows/ci.yml` — verifies pushes and pull requests
- `.github/workflows/release.yml` — creates GitHub Releases from `v*` tags and publishes missing npm versions
- npm trusted-publishing support through GitHub Actions OIDC

### One-time GitHub setup

Create an empty public repository named `skills-mcp` under:

```text
muhammadismailkhan0009
```

The local repository already has this remote configured:

```bash
git remote -v
```

Then push:

```bash
git push -u origin main
```

### One-time npm setup

The npm package is scoped as:

```text
@myriadcodelabs/skills-mcp
```

You must own the `@myriadcodelabs` npm scope, either as your npm username or as an npm organization where you have publish permission. If you do not own that scope, change the package name before the first publish.

Authenticate locally:

```bash
npm login
npm whoami
```

The first package version must be published manually because npm trusted publishing can only be configured after the package exists:

```bash
npm run release:check
npm publish --access public
```
### Configure npm trusted publishing

After the first npm publish, use either the npm website or the npm CLI to trust the GitHub Actions release workflow.

Using npm CLI requires npm 11.15.0 or newer:

```bash
npm install --global "npm@^11.15.0"

npm trust github @myriadcodelabs/skills-mcp \
  --repo muhammadismailkhan0009/skills-mcp \
  --file release.yml \
  --allow-publish
```

The equivalent npm website configuration is:

- Provider: GitHub Actions
- GitHub user/organization: `muhammadismailkhan0009`
- Repository: `skills-mcp`
- Workflow filename: `release.yml`
- Allow direct publish: enabled

No long-lived `NPM_TOKEN` GitHub secret is required.

### First GitHub release

After the first npm version has been published and trusted publishing is configured:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow will:

1. install dependencies
2. run typecheck, tests, build, and npm package verification
3. verify that tag `v0.1.0` matches package version `0.1.0`
4. detect that `@myriadcodelabs/skills-mcp@0.1.0` already exists on npm and skip duplicate publication
5. create the GitHub Release with generated release notes

### Subsequent releases

Choose the appropriate semantic-version bump without creating the tag yet:

```bash
npm version patch --no-git-tag-version
# or:
npm version minor --no-git-tag-version
# or:
npm version major --no-git-tag-version
```

Run the full release checks before committing or tagging:

```bash
npm run release:check
```

Then commit the version bump and create the matching tag:

```bash
VERSION="$(node -p "require('./package.json').version")"
git add package.json package-lock.json
git commit -m "chore: release v$VERSION"
git tag "v$VERSION"
git push origin main --follow-tags
```

For subsequent versions, the GitHub Actions release workflow creates the GitHub Release and publishes the new npm version automatically using OIDC trusted publishing.
