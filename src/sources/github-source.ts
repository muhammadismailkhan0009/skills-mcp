import type { SkillSource } from "./types.js";

export function createGitHubSource(repositoryUrl: string): SkillSource {
  let url: URL;
  try {
    url = new URL(repositoryUrl.trim());
  } catch {
    throw new Error("Enter a valid GitHub repository URL");
  }

  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
    throw new Error("Only public github.com repository URLs are supported");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("GitHub URL must point to a repository");
  }

  const owner = parts[0];
  const repositoryName = parts[1].replace(/\.git$/i, "");
  if (!repositoryName) {
    throw new Error("GitHub URL must point to a repository");
  }

  return {
    id: `${owner}~${repositoryName}`,
    repository: `${owner}/${repositoryName}`,
    enabled: true,
  };
}
