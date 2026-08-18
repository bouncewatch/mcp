# Make

Bounce Watch works in Make today. There is no Make app to install.

The MCP Client is included in all paid Make plans.

## Setup

1. Add the **MCP Client** module to your scenario.
2. Create a connection with:
   - **Server URL:** `https://api.bouncewatch.com/api/v1/mcp`
   - **Authentication:** token, sent as `X-API-Key`
3. Make loads the available tools automatically. You should see ten.

Keys: https://bouncewatch.com/api-panel/mcp

## Notes

- Make calls `tools/list` when you create the connection, so the tool list and
  its input schemas fill in on their own — nothing to map by hand.
- `get_signal_taxonomy` and `get_refresh_status` cost no credits, so they are
  safe modules to test a scenario with.
