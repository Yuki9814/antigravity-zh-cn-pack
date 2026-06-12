import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { WebSocketServer } from 'ws';
import { injectIntoPort } from '../src/cdp-client.mjs';
import { readDictionary } from '../src/dictionary.mjs';
import { buildInjectedScript } from '../src/injected-localizer.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('CDP injection reaches mock renderer and can run repeatedly', async () => {
  const fixture = await createCdpFixture();
  try {
    const { dictionary } = await readDictionary(root);
    const script = buildInjectedScript(dictionary);
    const first = await injectIntoPort(fixture.port, script, { timeoutMs: 1500 });
    const second = await injectIntoPort(fixture.port, script, { timeoutMs: 1500 });

    assert.equal(first.length, 1);
    assert.equal(first[0].ok, true);
    assert.equal(first[0].result.status, 'installed');
    assert.equal(second[0].ok, true);
    assert.equal(fixture.runtimeEvaluateCalls, 2);
  } finally {
    await fixture.close();
  }
});

test('generated injected script parses as JavaScript', async () => {
  const { dictionary } = await readDictionary(root);
  const script = buildInjectedScript(dictionary);
  assert.doesNotThrow(() => new Function(script));
});

async function createCdpFixture() {
  let runtimeEvaluateCalls = 0;
  const server = http.createServer((request, response) => {
    if (request.url === '/json/list') {
      const address = server.address();
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify([
        {
          id: 'page-1',
          type: 'page',
          title: 'Antigravity',
          url: 'app://antigravity/agent',
          webSocketDebuggerUrl: `ws://127.0.0.1:${address.port}/devtools/page/1`
        }
      ]));
      return;
    }
    if (request.url === '/json/version') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ Browser: 'MockCDP/1.0' }));
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  const wss = new WebSocketServer({ server, path: '/devtools/page/1' });
  wss.on('connection', (socket) => {
    socket.on('message', (data) => {
      const message = JSON.parse(String(data));
      if (message.method === 'Runtime.evaluate') {
        runtimeEvaluateCalls += 1;
        socket.send(JSON.stringify({
          id: message.id,
          result: {
            result: {
              type: 'object',
              value: { ok: true, status: 'installed', version: '0.1.0' }
            }
          }
        }));
        return;
      }
      socket.send(JSON.stringify({ id: message.id, result: {} }));
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    get port() {
      return server.address().port;
    },
    get runtimeEvaluateCalls() {
      return runtimeEvaluateCalls;
    },
    async close() {
      await new Promise((resolve) => wss.close(resolve));
      await new Promise((resolve) => server.close(resolve));
    }
  };
}
