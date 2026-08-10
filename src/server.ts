/**
 * github-lite — a minimal MCP server (a STUB, not a github-mcp fork).
 *
 * It exposes one tool, `list_issues`, with owner/repo as REQUIRED parameters —
 * matching how github-mcp-server's real tools work today. This server has
 * ZERO knowledge of roots, ZERO project-context awareness, and needs ZERO
 * changes for this demo. That's the point: the fix doesn't live here.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "github-lite", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_issues",
      description: "List issues for a repository.",
      inputSchema: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repo owner" },
          repo: { type: "string", description: "Repo name" },
        },
        required: ["owner", "repo"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== "list_issues") throw new Error(`unknown tool: ${req.params.name}`);
  const args = (req.params.arguments ?? {}) as { owner?: string; repo?: string };

  if (!args.owner || !args.repo) {
    return {
      content: [
        {
          type: "text",
          text: [
            "⛔ owner/repo are required — none supplied.",
            "   A real agent now has to enumerate repos, guess, or ask the user.",
            "   That's the context-bloat / no-project-focus friction (#1683, #1308).",
          ].join("\n"),
        },
      ],
    };
  }

  const issues = [
    { number: 1, title: "Set up CI", state: "open" },
    { number: 2, title: "Write the README", state: "open" },
  ];
  return {
    content: [
      {
        type: "text",
        text: [
          `✅ Scoped to ${args.owner}/${args.repo}`,
          "   No exploration phase. No server-side change required.",
          "",
          `   issues in ${args.owner}/${args.repo}:`,
          ...issues.map((i) => `     #${i.number} ${i.title} [${i.state}]`),
        ].join("\n"),
      },
    ],
  };
});

await server.connect(new StdioServerTransport());
