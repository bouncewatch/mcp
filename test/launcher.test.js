import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const BIN = new URL('../bin/bouncewatch-mcp.js', import.meta.url).pathname;

/** Run the launcher against a throwaway local endpoint and collect its stdout. */
function run(input, { env = {}, handler } = {}) {
  return new Promise((resolve, reject) => {
    import('node:http').then(({ createServer }) => {
      const server = createServer((req, res) => {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => handler(JSON.parse(body), res, req));
      });

      server.listen(0, () => {
        const child = spawn(process.execPath, [BIN], {
          env: {
            ...process.env,
            BOUNCEWATCH_API_KEY: 'test-key',
            BOUNCEWATCH_MCP_URL: `http://127.0.0.1:${server.address().port}/`,
            ...env,
          },
        });

        let out = '';
        child.stdout.on('data', (c) => (out += c));
        child.on('close', () => {
          server.close();
          resolve(out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));
        });
        child.on('error', reject);

        child.stdin.end(input);
      });
    });
  });
}

test('forwards a request and returns the reply untouched', async () => {
  const messages = await run('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n', {
    handler: (body, res) => {
      assert.equal(body.method, 'tools/list');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { tools: [] } }));
    },
  });

  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0], { jsonrpc: '2.0', id: 1, result: { tools: [] } });
});

test('sends the API key as a header', async () => {
  let seen;
  await run('{"jsonrpc":"2.0","id":1,"method":"ping"}\n', {
    handler: (body, res, req) => {
      seen = req.headers['x-api-key'];
      res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: {} }));
    },
  });

  assert.equal(seen, 'test-key');
});

test('a notification gets no reply', async () => {
  const messages = await run('{"jsonrpc":"2.0","method":"notifications/initialized"}\n', {
    handler: (_body, res) => res.end(''),
  });

  assert.equal(messages.length, 0);
});

test('replies keep the order the requests arrived in', async () => {
  const input =
    '{"jsonrpc":"2.0","id":1,"method":"slow"}\n' +
    '{"jsonrpc":"2.0","id":2,"method":"fast"}\n';

  const messages = await run(input, {
    handler: (body, res) => {
      const delay = body.method === 'slow' ? 60 : 0;
      setTimeout(() => res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: {} })), delay);
    },
  });

  assert.deepEqual(messages.map((m) => m.id), [1, 2]);
});

test('an unreachable server produces a JSON-RPC error, not a crash', async () => {
  const messages = await run('{"jsonrpc":"2.0","id":7,"method":"tools/list"}\n', {
    env: { BOUNCEWATCH_MCP_URL: 'http://127.0.0.1:1/' },
    handler: (_b, res) => res.end(''),
  });

  assert.equal(messages[0].id, 7);
  assert.equal(messages[0].error.code, -32603);
});

test('starts without an API key and sends no credential header', async () => {
  // A directory scanner and the MCP inspector both run this package with no
  // credentials. It used to exit(1) and show them nothing; the server serves
  // its catalogue to an anonymous caller now, so the launcher has to get out of
  // the way. The header must be ABSENT, not empty — the server counts a
  // credential that is present but unusable as a rejection, which would turn
  // "no key" back into "bad key".
  let seen;

  const messages = await run('{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n', {
    env: { BOUNCEWATCH_API_KEY: undefined },
    handler: (body, res, req) => {
      seen = req.headers;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { tools: [] } }));
    },
  });

  assert.equal(messages.length, 1, 'the launcher has to stay up long enough to answer');
  assert.equal(seen['x-api-key'], undefined);
  assert.equal(seen['authorization'], undefined);
});
