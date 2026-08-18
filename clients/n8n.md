# n8n

Bounce Watch works in n8n today. There is no community node to install.

## Setup

1. Add an **MCP Client Tool** node to your workflow.
2. Set **Transport** to `HTTP Streamable`.
3. **Endpoint:** `https://api.bouncewatch.com/api/v1/mcp`
4. Add a header:

   | Name | Value |
   | --- | --- |
   | `X-API-Key` | your key from https://bouncewatch.com/api-panel/mcp |

5. Set **Operation** to `List Tools` and execute once to confirm the connection.
   You should get ten tools back.

To use the node inside an AI Agent, n8n requires the environment variable
`N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.

## Notes

- No session id is needed. Each call is a plain POST.
- `Authorization: Bearer <key>` works too, if you prefer that header.
- `get_signal_taxonomy` is free to call and is a good connection test — it costs
  no credits.
