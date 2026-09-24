import { describe, expect, it } from "vitest";

import { createGitHubSource } from "../src/sources/github-source.js";

describe("public GitHub repository URL behavior", () => {
  it("derives the internal source from a public GitHub repository URL", () => {
    expect(
      createGitHubSource("https://github.com/muhammadismailkhan0009/dev-skills"),
    ).toEqual({
      id: "muhammadismailkhan0009~dev-skills",
      repository: "muhammadismailkhan0009/dev-skills",
      enabled: true,
    });
  });

  it("normalizes trailing slashes and .git suffixes", () => {
    expect(
      createGitHubSource("https://github.com/example/my-skills.git/"),
    ).toEqual({
      id: "example~my-skills",
      repository: "example/my-skills",
      enabled: true,
    });
  });

  it("rejects non-GitHub and non-repository URLs", () => {
    expect(() => createGitHubSource("https://gitlab.com/example/skills")).toThrow(
      /github/i,
    );
    expect(() => createGitHubSource("https://github.com/example")).toThrow(
      /repository/i,
    );
  });
});
