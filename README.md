# Bounce Watch MCP

Find out what changed at a company, and when.

Bounce Watch tracks buying and momentum signals for companies — who raised money,
who hired a senior person, who opened an office, won a customer, or announced a
partnership. Over forty kinds of event, and every one carries the date it
happened. This repository holds the connection details and client configs for the hosted
Model Context Protocol server.

The server itself is hosted. There is nothing to install or run.

```
https://api.bouncewatch.com/api/v1/mcp
```

- **Transport:** HTTP streamable
- **Auth:** OAuth, or an API key in `X-API-Key` / `Authorization: Bearer`
- **Free tier:** 2,500 credits on every new account. No card, no expiry.
- **Registry name:** `com.bouncewatch/signals`

## Connect

### Claude Code

```bash
claude mcp add bouncewatch --transport http https://api.bouncewatch.com/api/v1/mcp
```

Press Connect and approve in the browser. No key to paste.

### Cursor, VS Code

Ready-made config files are in [`clients/`](clients/). Cursor takes the URL
directly:

```json
{
  "mcpServers": {
    "bouncewatch": {
      "url": "https://api.bouncewatch.com/api/v1/mcp"
    }
  }
}
```

### Claude Desktop

Add it in the app: **Settings → Connectors → Add custom connector**, with the URL
above. Claude Desktop's config file will not take a remote URL — that file is for
servers running on your own machine.

If you would rather keep it in the config file anyway, point it at the launcher
below.

### Clients that only speak stdio

For clients that cannot open an HTTP connection, this repository publishes a
launcher — a transparent pipe to the same endpoint, with no dependencies:

```json
{
  "mcpServers": {
    "bouncewatch": {
      "command": "npx",
      "args": ["-y", "@bouncewatch/mcp"],
      "env": { "BOUNCEWATCH_API_KEY": "your-key" }
    }
  }
}
```

### n8n and Make

Both connect to remote MCP servers without any custom node or app. Paste the URL,
add your API key as a header, and the tool list loads itself. See
[`clients/n8n.md`](clients/n8n.md) and [`clients/make.md`](clients/make.md).

## What you can ask

Ask in plain language. The server answers with real company names, dates and
sources.

- "Which Dutch companies under 50 people raised in the last month?"
- "What has been happening at stripe.com?"
- "Which companies in Belgium announced a partnership in the last two weeks?"
- "Tell me the next time something happens at these twelve accounts."

## Tools

Ten tools, eight of them read-only.

| Tool | What it does |
| --- | --- |
| `search_signals` | The latest signals across the whole index — which companies did something recently, what it was, and when |
| `search_companies` | Find companies by country, headcount and funding stage |
| `find_company` | Look up a company by name and get its domain |
| `get_company` | Firmographic profile of one company |
| `get_company_signals` | The dated signal timeline for one company |
| `refresh_company` | Queue a fresh scan of one company |
| `get_refresh_status` | Check a queued scan. Free to call |
| `watch_company` | Put a standing watch on a company |
| `check_watches` | What happened at the companies this key already watches |
| `get_signal_taxonomy` | Every signal type, grouped by category. Free to call |

`refresh_company` and `watch_company` are the two that write.

## Prompts

Five saved prompts ship with the server.

| Prompt | What it is for |
| --- | --- |
| `pre_round_radar` | Companies showing growth momentum that have not raised recently — the ones likely raising soon |
| `why_now` | An outreach angle for one company: what changed, why it matters, what to open with |
| `funded_and_hiring` | Closed a round and hiring in the same window — new budget plus a mandate to spend it |
| `account_watch_brief` | What happened at a named list of companies since a given date |
| `risk_scan` | Layoffs, shutdowns and leadership exits across a list of companies |

## How signals work

**Every signal carries its own date.** Not the date we found it — the date the
thing happened. That is what lets you separate this week's news from last year's.

**Every signal carries a weight from 1 to 10.** A funding round outranks a
conference booth. Roughly a third of what happens at any company is background —
event attendance, news mentions, follower drift — and all of it is weighted 1 or
2 so you can drop it in one filter. Set a floor of 3 or 4 and you are searching
on substance.

**An empty result is not the same as a quiet company.** Every answer states how
recently the company was looked at. When coverage is thin, the answer says so
rather than implying nothing happened.

## Credits

One question typically costs around 50 credits — a signal search plus a timeline
for a handful of companies — so the free tier's 2,500 credits cover about 50 of
them. `get_signal_taxonomy` and `get_refresh_status` cost nothing at all.

Keys and balances: https://bouncewatch.com/api-panel/mcp

## Also listed at

- Official MCP Registry, as `com.bouncewatch/signals`
  ([entry](https://registry.modelcontextprotocol.io/v0/servers?search=bouncewatch))
- [Glama](https://glama.ai/mcp/connectors/com.bouncewatch/signals)
- [mcp.so](https://mcp.so/server/bounce-watch)
- [Smithery](https://smithery.ai/servers/bouncewatch/signals)
- [MCP Market](https://mcpmarket.com/server/bounce-watch-company-signal-intelligence)

## Links

- Documentation: https://docs.bouncewatch.com/mcp/overview
- Pricing: https://bouncewatch.com/pricing
- Product: https://bouncewatch.com

## License

MIT. See [LICENSE](LICENSE). The hosted service itself is a commercial product;
this repository covers the connection details and examples.
