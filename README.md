# mcp-project-context

**Give an MCP server "current-project" focus — with zero changes to the server.**

The host already knows what project you're in. It can fill the tool call before it's ever sent. The server never has to change, never needs roots, never needs a new protocol primitive.

A working proof of the reframed path on
[github/github-mcp-server#1683](https://github.com/github/github-mcp-server/issues/1683), post [SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577) (Roots deprecated, same 2026-07-28-RC wave as STATELESS core):

> "Roots: Vague semantics, overlaps with **tool parameters and server configuration**."

This is the tool-parameter half of that overlap, demonstrated end-to-end.

## The problem (#1683 / #1308)

Ask a GitHub-connected agent to "show *this* project's issues" and it wanders: `list_repositories` → enumerate every repo → guess the current one → maybe ask you. Slow, scattered, burns context the model needs for the actual task.

## The fix

```
project.faf              HOST (MCP client)              SERVER
(repo identity   ──▶ fills owner/repo into  ──▶  receives a complete,
 the host reads)      the tools/call BEFORE          ordinary tool call
                        it's dispatched               — never changes
```

The **host** reads the project's identity and fills the tool's *existing* parameters before dispatch. The **server** is unmodified — it already declared `owner`/`repo` as required fields; it just always gets them now.

## Before / after (actual output of `npm run demo`)

```
BEFORE — plain callTool(), no project.faf awareness
⛔ owner/repo are required — none supplied.
   A real agent now has to enumerate repos, guess, or ask the user.
   That's the context-bloat / no-project-focus friction (#1683, #1308).

AFTER  — same call, routed through callToolWithFaf()
· auto-filled from project.faf: owner, repo
✅ Scoped to octocat/Hello-World
   No exploration phase. No server-side change required.

   issues in octocat/Hello-World:
     #1 Set up CI [open]
     #2 Write the README [open]
```

The server binary is byte-for-byte identical in both runs. Only the host changed.

## Why this, not roots

[`mcp-current-repo`](https://github.com/Wolfe-Jam/mcp-current-repo) proved the same problem solvable via MCP roots — since deprecated (SEP-2577). That demo's actual finding (a TS SDK `file://`-only URI constraint on root identifiers) still stands as a useful spec note. This demo proves the *other* named surface instead: **tool parameters**, which requires nothing from the server or the protocol — just a host that reads `project.faf` and fills what it already knows.

## Where the project identity comes from

This demo reads `project.faf` — a typed, portable context file ([IANA-registered](https://www.iana.org/assignments/media-types/application/vnd.faf+yaml) as `application/vnd.faf+yaml`) that already carries the project's identity in one field. Clean source: the file *is* the scope, and it travels with the repo.

But the mechanism is source-agnostic — derive the repo from `.git`, an env var, an IDE workspace setting, whatever the host has. `project.faf` is just one tidy way to feed it.

## What a host would add (minimal)

1. Read the project's repo identity from wherever the host already sources it.
2. Before calling a tool, check its schema for fields the host can answer.
3. Fill only what's missing. Never override an explicit argument.

See [`src/param-fill.ts`](./src/param-fill.ts) — under 40 lines, no dependencies beyond the MCP SDK already required to talk to any server.

## Run it

```bash
npm install
npm run demo
```

## What this is (and isn't)

A reference implementation, not a library — nothing here gets `npm install`ed into a real host. Read `src/param-fill.ts`, reimplement the pattern wherever your host reads `.faf`/`.git`/workspace config today. The value is the mechanism, not the package.

MIT. A stub for discussion, not a fork.
