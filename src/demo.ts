/**
 * demo — the HOST side.
 *
 * A real MCP host (Claude Code, Cursor, …) already reads `project.faf` from
 * the workspace. Here it uses that to auto-fill tool-call parameters BEFORE
 * dispatching to an ordinary, unmodified MCP server (github-lite, a stub).
 *
 *   BEFORE — a plain callTool(), no project.faf awareness → the server hits
 *            the "owner/repo required, none supplied" friction.
 *   AFTER  — the SAME call, routed through callToolWithFaf() → owner/repo
 *            are filled from project.faf before the request ever leaves
 *            the host. The server is byte-for-byte identical in both runs.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { callToolWithFaf, fafFieldsFromRepository } from "./param-fill.js";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..");

/** The host reads project.faf and extracts the repo identity (one field). */
function readRepoFromFaf(): string | null {
  try {
    const faf = readFileSync(join(projectRoot, "project.faf"), "utf8");
    const m = faf.match(/^\s*repository:\s*(\S+)/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function connect(): Promise<Client> {
  const transport = new StdioClientTransport({
    command: join(projectRoot, "node_modules/.bin/tsx"),
    args: [join(projectRoot, "src/server.ts")],
  });
  const client = new Client({ name: "demo-host", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

const repository = readRepoFromFaf();
const fafFields = fafFieldsFromRepository(repository);

console.log(`\n🛰️  mcp-project-context — project.faf → tool-parameter injection → auto-scope`);
console.log(`    project.faf repository: ${repository ?? "(none found)"}`);

console.log(`\n${"─".repeat(68)}\nBEFORE — plain callTool(), no project.faf awareness\n${"─".repeat(68)}`);
{
  const client = await connect();
  const res: any = await client.callTool({ name: "list_issues", arguments: {} });
  console.log(res.content.map((c: any) => c.text).join("\n"));
  await client.close();
}

console.log(
  `\n${"─".repeat(68)}\nAFTER  — same call, routed through callToolWithFaf()\n${"─".repeat(68)}`,
);
{
  const client = await connect();
  const { result, filled } = await callToolWithFaf(client, "list_issues", {}, fafFields);
  console.log(`· auto-filled from project.faf: ${filled.join(", ") || "(none)"}`);
  console.log(result.content.map((c: any) => c.text).join("\n"));
  await client.close();
}

console.log(
  `\n${"═".repeat(68)}\n` +
    `The server received a complete tools/call in both runs. It never changed,\n` +
    `never got roots capability, never got told about project.faf. Only the\n` +
    `HOST changed — the exact tool-parameter/config surface SEP-2577 names as\n` +
    `roots' overlap. Zero protocol change, zero server-side cooperation needed.\n` +
    `${"═".repeat(68)}\n`,
);
