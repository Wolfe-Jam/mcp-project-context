/**
 * param-fill — the HOST-side mechanism.
 *
 * Wraps a normal MCP `Client.callTool`. Before dispatching, it checks the
 * target tool's OWN inputSchema (fetched via the OWN tools/list — no server
 * change needed) for parameter names project.faf already knows the answer
 * to, and fills any that are missing from the call. If the tool doesn't
 * declare a matching field, or the caller already supplied it, nothing
 * changes — this never overrides an explicit argument.
 *
 * No new protocol primitive. No roots. No server cooperation required —
 * this works against any MCP server whose tool schemas already have
 * owner/repo-shaped fields, github-mcp-server included, today, as-is.
 */
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

export type FafFields = Record<string, string>;

export async function callToolWithFaf(
  client: Client,
  toolName: string,
  args: Record<string, unknown>,
  fafFields: FafFields,
): Promise<{ result: any; filled: string[] }> {
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === toolName);
  const schemaProps = ((tool?.inputSchema as any)?.properties ?? {}) as Record<string, unknown>;

  const merged: Record<string, unknown> = { ...args };
  const filled: string[] = [];

  for (const key of Object.keys(schemaProps)) {
    if (merged[key] === undefined && fafFields[key] !== undefined) {
      merged[key] = fafFields[key];
      filled.push(key);
    }
  }

  const result = await client.callTool({ name: toolName, arguments: merged });
  return { result, filled };
}

/** Reads project.faf and extracts the fields this demo knows how to fill (owner, repo). */
export function fafFieldsFromRepository(repository: string | null): FafFields {
  if (!repository) return {};
  const m = repository.match(/github\.com\/([^/\s]+)\/([^/\s]+)/i);
  return m ? { owner: m[1], repo: m[2] } : {};
}
