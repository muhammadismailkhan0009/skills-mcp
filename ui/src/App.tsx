import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Source {
  id: string;
  repository: string;
  enabled: boolean;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  sourceId: string;
  path: string;
}

interface SkillDetail {
  metadata: Skill;
  content: string;
  resources: string[];
}

interface ResourceDetail {
  content: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export default function App() {
  const [sources, setSources] = useState<Source[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const [detailContent, setDetailContent] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>("loading");
  const [error, setError] = useState<string | null>(null);

  const skillsBySource = useMemo(() => {
    const grouped = new Map<string, Skill[]>();
    for (const skill of skills) {
      const current = grouped.get(skill.sourceId) ?? [];
      current.push(skill);
      grouped.set(skill.sourceId, current);
    }
    return grouped;
  }, [skills]);

  async function reload() {
    const [nextSources, nextSkills] = await Promise.all([
      api<Source[]>("/api/sources"),
      api<Skill[]>("/api/skills"),
    ]);
    setSources(nextSources);
    setSkills(nextSkills);
  }

  useEffect(() => {
    reload()
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : String(caught)),
      )
      .finally(() => setBusy(null));
  }, []);

  async function addRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy("add");

    try {
      await api<Source>("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: repositoryUrl }),
      });
      setRepositoryUrl("");
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }
  async function toggleSource(source: Source) {
    setBusy(source.id);
    setError(null);
    try {
      await api(`/api/sources/${encodeURIComponent(source.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !source.enabled }),
      });
      if (source.enabled) {
        setExpandedSourceId(null);
        setSkillDetail(null);
        setDetailTitle(null);
        setDetailContent(null);
      }
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  async function refreshSource(source: Source) {
    setBusy(source.id);
    setError(null);
    try {
      await api(`/api/sources/${encodeURIComponent(source.id)}/refresh`, {
        method: "POST",
      });
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  async function removeSource(source: Source) {
    setBusy(source.id);
    setError(null);
    try {
      await api(`/api/sources/${encodeURIComponent(source.id)}`, {
        method: "DELETE",
      });
      if (expandedSourceId === source.id) {
        setExpandedSourceId(null);
        setSkillDetail(null);
        setDetailTitle(null);
        setDetailContent(null);
      }
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  async function openSkill(skill: Skill) {
    setBusy(skill.id);
    setError(null);
    try {
      const detail = await api<SkillDetail>(
        `/api/skill?id=${encodeURIComponent(skill.id)}`,
      );
      setSkillDetail(detail);
      setDetailTitle("SKILL.md");
      setDetailContent(detail.content);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  async function openResource(resourcePath: string) {
    if (!skillDetail) return;

    setBusy(resourcePath);
    setError(null);
    try {
      const resource = await api<ResourceDetail>(
        `/api/resource?id=${encodeURIComponent(skillDetail.metadata.id)}&path=${encodeURIComponent(resourcePath)}`,
      );
      setDetailTitle(resourcePath);
      setDetailContent(resource.content);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <GitBranch className="size-6" />
          <h1 className="text-2xl font-semibold tracking-tight">skills-mcp</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Add a public GitHub repository. Any directory containing{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">SKILL.md</code>{" "}
          becomes available through MCP.
        </p>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add repository</CardTitle>
          <CardDescription>
            Paste the public GitHub repository URL. Nothing else is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={addRepository}>
            <Input
              aria-label="GitHub repository URL"
              type="url"
              placeholder="https://github.com/owner/skills"
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
              required
            />
            <Button type="submit" disabled={busy === "add"}>
              {busy === "add" && <Loader2 className="animate-spin" />}
              Add repository
            </Button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Repositories</h2>
        <span className="text-xs text-muted-foreground">
          {sources.length} configured
        </span>
      </div>
      {busy === "loading" ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" />
            Loading repositories…
          </CardContent>
        </Card>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No repositories yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => {
            const sourceSkills = skillsBySource.get(source.id) ?? [];
            const expanded = expandedSourceId === source.id;
            const sourceBusy = busy === source.id;

            return (
              <Card key={source.id} className="gap-0 overflow-hidden py-0">
                <CardHeader className="py-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md border p-2">
                      <GitBranch className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        {source.repository}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <Badge variant={source.enabled ? "secondary" : "outline"}>
                          {source.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <span>
                          {source.enabled
                            ? sourceSkills.length +
                              " skill" +
                              (sourceSkills.length === 1 ? "" : "s")
                            : "Skills hidden from MCP"}
                        </span>
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={"https://github.com/" + source.repository}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={"Open " + source.repository + " on GitHub"}
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                  </div>
                </CardHeader>

                <CardFooter className="gap-2 border-t py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!source.enabled}
                    onClick={() => {
                      setExpandedSourceId(expanded ? null : source.id);
                      setSkillDetail(null);
                      setDetailTitle(null);
                      setDetailContent(null);
                    }}
                  >
                    {expanded ? <ChevronDown /> : <ChevronRight />}
                    Skills
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={sourceBusy || !source.enabled}
                    onClick={() => void refreshSource(source)}
                  >
                    <RefreshCw className={sourceBusy ? "animate-spin" : ""} />
                    Refresh
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sourceBusy}
                    onClick={() => void toggleSource(source)}
                  >
                    {source.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={sourceBusy}
                    onClick={() => void removeSource(source)}
                    aria-label={"Remove " + source.repository}
                  >
                    <Trash2 />
                  </Button>
                </CardFooter>

                {expanded && source.enabled && (
                  <CardContent className="border-t py-4">
                    {sourceSkills.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No SKILL.md files found.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {sourceSkills.map((skill) => (
                          <button
                            key={skill.id}
                            type="button"
                            className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
                            onClick={() => void openSkill(skill)}
                          >
                            <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">
                                {skill.name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {skill.description || skill.path}
                              </span>
                            </span>
                            {busy === skill.id && (
                              <Loader2 className="ml-auto mt-0.5 size-4 animate-spin" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {skillDetail?.metadata.sourceId === source.id && (
                      <div className="mt-5 rounded-lg border">
                        <div className="border-b px-4 py-3">
                          <div className="font-medium">{skillDetail.metadata.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {skillDetail.metadata.path}
                          </div>
                        </div>

                        {skillDetail.resources.length > 0 && (
                          <div className="flex flex-wrap gap-2 border-b px-4 py-3">
                            <Button
                              variant={detailTitle === "SKILL.md" ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => {
                                setDetailTitle("SKILL.md");
                                setDetailContent(skillDetail.content);
                              }}
                            >
                              SKILL.md
                            </Button>
                            {skillDetail.resources.map((resource) => (
                              <Button
                                key={resource}
                                variant={detailTitle === resource ? "secondary" : "outline"}
                                size="sm"
                                disabled={busy === resource}
                                onClick={() => void openResource(resource)}
                              >
                                {busy === resource && <Loader2 className="animate-spin" />}
                                {resource}
                              </Button>
                            ))}
                          </div>
                        )}

                        <div className="px-4 py-3">
                          <div className="mb-2 text-xs font-medium text-muted-foreground">
                            {detailTitle}
                          </div>
                          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs leading-5">
                            {detailContent}
                          </pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
