# Sect8 MCP Adapter

This is a standalone MCP service for Agentra or any other MCP-compatible client.

It does not change the main Sect8 app. Instead, it proxies MCP tool calls into the deployed Sect8 backend at `/api/agentCompute`.

## What it exposes

- MCP endpoint: `/mcp`
- Health check: `/health`

## Environment variables

- `SECT8_APP_URL` required. Base URL of the deployed Sect8 app, for example `https://sect8.xyz`
- `SECT8_AGENT_COMPUTE_PATH` optional. Defaults to `/api/agentCompute`
- `PORT` optional. Defaults to `8787`

## Local run

```bash
npm install
npm run dev
```

The MCP endpoint will be available at:

```text
http://localhost:8787/mcp
```

## Deploy flow

1. Deploy the main Sect8 app as usual.
2. Deploy this adapter as a separate Node service.
3. Set `SECT8_APP_URL` to your live app domain.
4. Paste the adapter URL ending in `/mcp` into Agentra.

## Tool exposed

### `analyze_section8_deal`

Passes the request through to the deployed Sect8 backend and returns the same reply plus storage roots when available.

Suggested Agentra endpoint:

```text
https://your-mcp-service.example.com/mcp
```