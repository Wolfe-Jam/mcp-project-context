# mcp-project-context

**Give an MCP server "current-project" focus — with zero changes to the server.**

Ask a GitHub-connected agent to "show *this* project's issues" and it wanders: `list_repositories` → enumerate every repo → guess the current one → maybe ask you. The host already knows what project you're in. It can fill the tool call before it's ever sent.

A working proof for [github/github-mcp-server#1683](https://github.com/github/github-mcp-server/issues/1683), post [SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577) (Roots deprecated, same 2026-07-28-RC wave as STATELESS core):

> "Roots: Vague semantics, overlaps with **tool parameters and server configuration**."

This is the tool-parameter half of that overlap — demonstrated, not just proposed.

## The fix

```
project.faf              HOST (MCP client)              SERVER
(repo identity   ──▶ fills owner/repo into  ──▶  receives a complete,
 the host reads)      the tools/call BEFORE          ordinary tool call
                        it's dispatched               — never changes
```

The **host** fills the tool's *existing* parameters before dispatch. The **server** is unmodified — it already declared `owner`/`repo` as required fields; it just always gets them now.

## Before / after (actual output of `npm run demo`)

```
BEFORE — plain callTool(), no project.faf awareness
⛔ owner/repo are required — none supplied.
   A real agent now has to enumerate repos, guess, or ask the user.

AFTER  — same call, routed through callToolWithFaf()
· auto-filled from project.faf: owner, repo
✅ Scoped to octocat/Hello-World
   No exploration phase. No server-side change required.

   issues in octocat/Hello-World:
     #1 Set up CI [open]
     #2 Write the README [open]
```

Server binary is byte-for-byte identical in both runs. Only the host changed.

```bash
npm install && npm run demo
```

## Why this, not roots

[`mcp-current-repo`](https://github.com/Wolfe-Jam/mcp-current-repo) proved the same fix via MCP roots — since deprecated. Its real finding (the TS SDK hard-enforces `file://` on root URIs) still stands as a useful spec note. This one proves the *other* surface SEP-2577 named: tool parameters — nothing required from the server or the protocol, just a host that fills what it already knows.

## Source-agnostic

This demo reads `project.faf` — a typed, [IANA-registered](https://www.iana.org/assignments/media-types/application/vnd.faf+yaml) context file (`application/vnd.faf+yaml`) that carries the project's identity in one field. But the mechanism doesn't care where identity comes from — `.git`, an env var, workspace config all feed it the same way.

**What a host would add:** read the repo identity → check the tool's schema for fields it can answer → fill only what's missing, never override an explicit argument. That's the whole idea. See [`src/param-fill.ts`](./src/param-fill.ts) — under 40 lines, no dependencies beyond the MCP SDK already required to talk to any server.

## What this is (and isn't)

A reference implementation, not a library — nothing here gets `npm install`ed into a real host. Read the code, reimplement the pattern wherever your host already sources project identity. The value is the mechanism, not the package.

MIT. A stub for discussion, not a fork.
