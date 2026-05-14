import { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";

const port = Number(process.env.PORT || 8787);
const appBaseUrl = process.env.SECT8_APP_URL?.trim().replace(/\/$/, "");
const agentComputePath = process.env.SECT8_AGENT_COMPUTE_PATH?.trim() || "/api/agentCompute";

if (!appBaseUrl) {
  throw new Error("Missing SECT8_APP_URL. Set it to the deployed Sect8 app base URL.");
}

const mcpApp = createMcpExpressApp({ host: "0.0.0.0" });

const memorySchema = z.object({
  agentId: z.string().optional(),
  lastScanTimestamp: z.number().optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  history: z.array(z.string()).optional(),
  owner: z.string().optional(),
  lastConversationAt: z.number().optional(),
}).loose();

function createServer() {
  const server = new McpServer(
    {
      name: "sect8-mcp-adapter",
      version: "1.0.0",
    },
    {
      capabilities: {
        logging: {},
      },
    }
  );

  server.registerTool(
    "analyze_section8_deal",
    {
      title: "Analyze Section 8 Deal",
      description: "Runs the Sect8 AI underwriting flow through the deployed Sect8 app and returns the reply with any storage roots.",
      inputSchema: {
        prompt: z.string().min(1).describe("The analysis prompt or property underwriting request."),
        owner: z.string().optional().describe("Optional wallet address used for agent memory persistence."),
        recordRoot: z.string().optional().describe("Optional existing Sect8 record root."),
        memory: memorySchema.optional().describe("Optional Sect8 memory object passed through to the deployed app."),
      },
      outputSchema: {
        success: z.boolean(),
        reply: z.string(),
        memoryRoot: z.string().nullable(),
        recordRoot: z.string().nullable(),
        storageError: z.string().nullable(),
      },
    },
    async ({ prompt, owner, recordRoot, memory }, extra): Promise<CallToolResult> => {
      const endpoint = `${appBaseUrl}${agentComputePath}`;

      try {
        await server.sendLoggingMessage(
          {
            level: "info",
            data: `Proxying Sect8 request to ${endpoint}`,
          },
          extra.sessionId
        );

        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            owner,
            recordRoot,
            memory,
          }),
        });

        const raw = (await upstream.text()) || "";
        let parsed: {
          success?: boolean;
          reply?: string;
          memoryRoot?: string | null;
          recordRoot?: string | null;
          storageError?: string | null;
          error?: string;
        };

        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch {
          parsed = { success: false, error: raw || `Unexpected non-JSON response from ${endpoint}` };
        }

        if (!upstream.ok || !parsed.success) {
          const message = parsed.error || parsed.reply || `Sect8 upstream returned HTTP ${upstream.status}`;
          return {
            content: [{ type: "text", text: `Sect8 error: ${message}` }],
            structuredContent: {
              success: false,
              reply: message,
              memoryRoot: parsed.memoryRoot ?? null,
              recordRoot: parsed.recordRoot ?? null,
              storageError: parsed.storageError ?? null,
            },
            isError: true,
          };
        }

        const result = {
          success: true,
          reply: parsed.reply || "",
          memoryRoot: parsed.memoryRoot ?? null,
          recordRoot: parsed.recordRoot ?? null,
          storageError: parsed.storageError ?? null,
        };

        return {
          content: [{ type: "text", text: result.reply }],
          structuredContent: result,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Sect8 proxy failure: ${message}` }],
          structuredContent: {
            success: false,
            reply: message,
            memoryRoot: null,
            recordRoot: null,
            storageError: null,
          },
          isError: true,
        };
      }
    }
  );

  return server;
}

mcpApp.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "sect8-mcp-adapter",
    appBaseUrl,
    agentComputePath,
  });
});

mcpApp.post("/mcp", async (req: Request, res: Response) => {
  const server = createServer();

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    console.error("[sect8-mcp-adapter] MCP request error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

mcpApp.get("/mcp", (_req: Request, res: Response) => {
  res.status(405).set("Allow", "POST").send("Method Not Allowed");
});

mcpApp.delete("/mcp", (_req: Request, res: Response) => {
  res.status(405).set("Allow", "POST").send("Method Not Allowed");
});

mcpApp.listen(port, (error?: Error) => {
  if (error) {
    console.error("[sect8-mcp-adapter] Failed to start:", error);
    process.exit(1);
  }

  console.log(`[sect8-mcp-adapter] Listening on port ${port}`);
  console.log(`[sect8-mcp-adapter] MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`[sect8-mcp-adapter] Upstream Sect8 app: ${appBaseUrl}${agentComputePath}`);
});