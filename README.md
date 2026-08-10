# mcp-project-context

Host-side injection of project identity into existing MCP tool parameters.

This reference implementation shows how an MCP host can give tools current-project focus by filling parameters such as `owner` and `repo` *before* the call is dispatched. The server receives a normal, complete `tools/call` and requires no modification.

## Problem

Many MCP tools (including those in the official github-mcp-server) declare `owner` and `repo` as required parameters. When a user asks an agent to act on "this project," the host already knows the repository identity. Without that identity being supplied, the agent is forced into an exploration phase:

1. List repositories
2. Guess which one is current
3. Possibly ask the user

This costs context and latency. The friction is tracked in [github/github-mcp-server#1683](https://github.com/github/github-mcp-server/issues/1683).

## Solution

The host:

1. Obtains the current project identity from a local source
2. Inspects the target tool's own `inputSchema` (via `tools/list`)
3. Fills only parameters that are both declared by the tool and currently missing from the call
4. Dispatches an ordinary `tools/call`

```
project identity          HOST                          SERVER
(project.faf, .git,   →   inspect inputSchema        →  ordinary tools/call
env, workspace…)         fill missing fields only      (unchanged)
```

The server is unaware of the injection. No roots, no new protocol primitives, and no server-side cooperation are required. The same host logic works against any MCP server whose tools already declare matching parameter names, including the current github-mcp-server.

## Why not Roots

[SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577) deprecated Roots in part because of vague semantics and overlap with tool parameters and server configuration. An earlier experiment, [mcp-current-repo](https://github.com/Wolfe-Jam/mcp-current-repo), used Roots to carry project identity; that surface is no longer viable. Parameter injection uses the surface the SEP itself named as the natural alternative.

## Render project.faf

```bash
npx faf-cli show
```

Renders the current `project.faf` as an HTML card (IANA media type `application/vnd.faf+yaml`).

## Demo

```bash
npm install && npm run demo
```

The demo runs the identical tool call twice against an unmodified stub server that mirrors the required parameters of real github-mcp-server tools:

Before (plain callTool):
```
⛔ owner/repo are required — none supplied.
   A real agent now has to enumerate repos, guess, or ask the user.
```

After (same call routed through callToolWithFaf):
```
· auto-filled from project.faf: owner, repo
✅ Scoped to octocat/Hello-World
   No exploration phase. No server-side change required.

   issues in octocat/Hello-World:
     #1 Set up CI [open]
     #2 Write the README [open]
```

The server binary is byte-for-byte identical in both runs. Only the host changed.

## Core logic

`src/param-fill.ts` (48 lines). It:

- Reads the tool's own `inputSchema`
- Fills only parameters that are both present in the schema and missing from the call arguments
- Never overrides an explicit argument supplied by the caller

Identity source is deliberately source-agnostic. This demo reads its `repository` field from `project.faf`; a production host can derive the same value from `.git`, environment variables, or workspace configuration.

## What this is

A reference implementation of a host-side pattern for discussion.

## What this is not

- Not a library or package intended for installation
- Not an MCP server
- Not a proposal for new protocol surface
- Not a full project-context system

The value is the mechanism. Hosts that already know the current repository can implement the same logic directly.

## Related

- [github/github-mcp-server#1683](https://github.com/github/github-mcp-server/issues/1683)
- [SEP-2577 (Roots deprecation)](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577)
- Predecessor (now obsolete): [mcp-current-repo](https://github.com/Wolfe-Jam/mcp-current-repo)

MIT
