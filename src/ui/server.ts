import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { SkillsRuntime } from "../runtime/skills-runtime.js";
import { MANAGEMENT_PAGE } from "./page.js";

export interface ManagementUiHandle {
  url: string;
  close(): Promise<void>;
}

export interface ManagementUiOptions {
  port?: number;
  host?: string;
}

export async function startManagementUi(
  runtime: SkillsRuntime,
  options: ManagementUiOptions = {},
): Promise<ManagementUiHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3218;

  const server = createServer((request, response) => {
    void handleRequest(runtime, request, response);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error("Unable to resolve management UI address");
  }

  return {
    url: `http://${host}:${address.port}/`,
    close: () => closeServer(server),
  };
}

async function handleRequest(
  runtime: SkillsRuntime,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/") {
      sendText(response, 200, MANAGEMENT_PAGE, "text/html; charset=utf-8");
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/sources") {
      sendJson(response, 200, await runtime.listSources());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/sources") {
      const body = await readJsonBody(request);
      const source = parseNewSource(body);
      await runtime.addSource(source);
      sendJson(response, 201, source);
      return;
    }
    const sourceMatch = /^\/api\/sources\/([^/]+)$/.exec(url.pathname);
    if (sourceMatch?.[1]) {
      const id = decodeURIComponent(sourceMatch[1]);

      if (request.method === "DELETE") {
        await runtime.removeSource(id);
        response.writeHead(204).end();
        return;
      }

      if (request.method === "PATCH") {
        const body = await readJsonBody(request);
        if (
          typeof body !== "object" ||
          body === null ||
          typeof (body as { enabled?: unknown }).enabled !== "boolean"
        ) {
          throw new Error("enabled must be a boolean");
        }

        await runtime.setSourceEnabled(
          id,
          (body as { enabled: boolean }).enabled,
        );
        sendJson(response, 200, { ok: true });
        return;
      }
    }

    const refreshMatch =
      /^\/api\/sources\/([^/]+)\/refresh$/.exec(url.pathname);
    if (request.method === "POST" && refreshMatch?.[1]) {
      await runtime.refreshSource(decodeURIComponent(refreshMatch[1]));
      sendJson(response, 200, { ok: true });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/skills") {
      const sourceId = url.searchParams.get("source");
      const skills = runtime
        .listSkills()
        .filter((skill) => !sourceId || skill.sourceId === sourceId);
      sendJson(response, 200, skills);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/skill") {
      const id = requireQuery(url, "id");
      const metadata = runtime.listSkills().find((skill) => skill.id === id);
      if (!metadata) throw new Error(`Unknown skill: ${id}`);

      sendJson(response, 200, {
        metadata,
        content: await runtime.readSkill(id),
        resources: runtime.listSkillResources(id),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/resource") {
      const id = requireQuery(url, "id");
      const resourcePath = requireQuery(url, "path");
      sendJson(response, 200, {
        content: await runtime.readSkillResource(id, resourcePath),
      });
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Request failed",
    });
  }
}
async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
    throw new Error("Content-Type must be application/json");
  }

  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 64 * 1024) throw new Error("Request body too large");
  }

  try {
    return JSON.parse(body || "{}") as unknown;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function parseNewSource(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be an object");
  }

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.id !== "string") throw new Error("id is required");
  if (typeof candidate.repository !== "string") {
    throw new Error("repository is required");
  }

  return {
    id: candidate.id,
    repository: candidate.repository,
    ...(typeof candidate.ref === "string" && candidate.ref.trim()
      ? { ref: candidate.ref }
      : {}),
    enabled: true,
  };
}
function requireQuery(url: URL, name: string): string {
  const value = url.searchParams.get(name);
  if (!value) throw new Error(`Missing query parameter: ${name}`);
  return value;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  sendText(
    response,
    status,
    JSON.stringify(body),
    "application/json; charset=utf-8",
  );
}

function sendText(
  response: ServerResponse,
  status: number,
  body: string,
  contentType: string,
): void {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

function closeServer(
  server: ReturnType<typeof createServer>,
): Promise<void> {
  if (!server.listening) return Promise.resolve();

  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
