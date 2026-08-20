#!/usr/bin/env node
/**
 * stdio launcher for the hosted Bounce Watch MCP server.
 *
 * Most clients can talk to https://api.bouncewatch.com/api/v1/mcp directly over
 * HTTP and should do exactly that — this launcher exists for the ones that only
 * speak stdio.
 *
 * It is a transparent pipe, not a reimplementation: every JSON-RPC message from
 * stdin is POSTed to the endpoint unchanged and the reply is written back to
 * stdout. That works because the server is stateless per request — it issues no
 * session id and requires none — so there is no handshake to keep in sync and
 * nothing here to drift out of date when the server adds a tool.
 *
 * Zero dependencies, on purpose. Nothing here is worth a supply chain.
 *
 * Usage:
 *   BOUNCEWATCH_API_KEY=... npx @bouncewatch/mcp
 *   npx @bouncewatch/mcp --url https://api.bouncewatch.com/api/v1/mcp
 *
 * The key is optional to START — without one the tool list still loads and tool
 * calls are refused with an explanation. See the note above the header block.
 */

const DEFAULT_URL = 'https://api.bouncewatch.com/api/v1/mcp';

function readArg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

const endpoint = readArg('url') || process.env.BOUNCEWATCH_MCP_URL || DEFAULT_URL;
const apiKey = readArg('key') || process.env.BOUNCEWATCH_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
  'MCP-Protocol-Version': '2025-06-18',
  'User-Agent': 'bouncewatch-mcp-launcher',
};

/**
 * No key is a warning, not a stop.
 *
 * This used to exit(1). That made sense while the server refused everything
 * without credentials — starting up only to fail on the first call would have
 * been a worse way to learn the same thing. It stopped making sense when the
 * server opened its catalogue: describing it is public now, so a launcher that
 * will not start is stricter than the thing it is a pipe to, and anything that
 * inspects the package without credentials — a directory's scanner, someone
 * running the MCP inspector to see what this is — is told nothing at all rather
 * than being shown ten tools.
 *
 * The header is OMITTED rather than sent empty, deliberately. The server treats
 * a credential that is present but unusable as a rejection, which is right: a
 * revoked key must not be quietly downgraded to an anonymous session. Sending
 * `X-API-Key: undefined` would trip exactly that and turn "no key" into "bad
 * key" — the one failure mode this change is meant to avoid.
 *
 * What a tool call then returns is not a bare 401: the server answers with a
 * sentence naming both ways in. So the information this exit used to carry is
 * still delivered, twice — here, and again at the moment it actually matters.
 */
if (apiKey) {
  headers['X-API-Key'] = apiKey;
} else {
  process.stderr.write(
    'bouncewatch-mcp: starting without an API key.\n' +
    'The tool list will load, but every tool call will be refused until this connection has one.\n' +
    'Set BOUNCEWATCH_API_KEY, or pass --key. Get one at https://bouncewatch.com/mcp\n' +
    'Clients that support OAuth can skip this launcher and connect to the URL directly.\n'
  );
}

/** Write one JSON-RPC message to stdout, newline delimited. */
function emit(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

/**
 * Forward one message. Notifications (no `id`) get no reply by definition, so a
 * transport-level failure on one is dropped rather than answered — inventing an
 * id to complain about would be a protocol violation of its own.
 */
async function forward(message) {
  const isNotification = message.id === undefined || message.id === null;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(message),
    });

    const text = await response.text();
    if (isNotification) return;

    if (!text) {
      emit({
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32603, message: `Empty reply from server (HTTP ${response.status})` },
      });
      return;
    }

    // Pass the server's own envelope through untouched, including its errors:
    // the messages are written for the agent reading them.
    try {
      emit(JSON.parse(text));
    } catch {
      emit({
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32603, message: `Unparseable reply from server (HTTP ${response.status})` },
      });
    }
  } catch (error) {
    if (isNotification) return;
    emit({
      jsonrpc: '2.0',
      id: message.id,
      error: { code: -32603, message: `Could not reach ${endpoint}: ${error.message}` },
    });
  }
}

// Messages are handled in arrival order. A client may have several in flight,
// but replies must not overtake each other on the way back, so each waits.
let queue = Promise.resolve();
let buffer = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  buffer += chunk;

  let newline;
  while ((newline = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;

    let message;
    try {
      message = JSON.parse(line);
    } catch {
      emit({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      continue;
    }

    queue = queue.then(() => forward(message));
  }
});

process.stdin.on('end', () => {
  queue.then(() => process.exit(0));
});
