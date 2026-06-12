const DEFAULT_TIMEOUT_MS = 1200;

export async function listInspectableTargets(port, options = {}) {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`, options);
  if (!Array.isArray(targets)) {
    return [];
  }
  return targets.filter((target) => {
    if (!target.webSocketDebuggerUrl) {
      return false;
    }
    return ['page', 'webview', 'background_page', 'other'].includes(target.type) || /antigravity/i.test(`${target.title ?? ''} ${target.url ?? ''}`);
  });
}

export async function isCdpPort(port, options = {}) {
  try {
    const version = await fetchJson(`http://127.0.0.1:${port}/json/version`, options);
    return Boolean(version?.Browser || version?.webSocketDebuggerUrl);
  } catch {
    return false;
  }
}

export async function injectIntoPort(port, expression, options = {}) {
  const targets = await listInspectableTargets(port, options);
  const results = [];
  for (const target of targets) {
    try {
      const result = await evaluateOnWebSocket(target.webSocketDebuggerUrl, expression, options);
      results.push({ ok: true, port, targetId: target.id, title: target.title, url: target.url, result });
    } catch (error) {
      results.push({ ok: false, port, targetId: target.id, title: target.title, url: target.url, error: error.message });
    }
  }
  return results;
}

export async function evaluateExpressionOnPort(port, expression, options = {}) {
  const targets = await listInspectableTargets(port, options);
  const results = [];
  for (const target of targets) {
    try {
      const result = await evaluateOnWebSocket(target.webSocketDebuggerUrl, expression, options);
      results.push({ ok: true, port, targetId: target.id, title: target.title, url: target.url, result });
    } catch (error) {
      results.push({ ok: false, port, targetId: target.id, title: target.title, url: target.url, error: error.message });
    }
  }
  return results;
}

export async function evaluateOnWebSocket(webSocketUrl, expression, options = {}) {
  const connection = await openCdp(webSocketUrl, options);
  try {
    await connection.send('Runtime.enable');
    const response = await connection.send('Runtime.evaluate', {
      expression,
      awaitPromise: false,
      returnByValue: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.text || 'Runtime.evaluate failed');
    }
    return response.result?.value ?? response.result?.description ?? null;
  } finally {
    connection.close();
  }
}

export async function openCdp(webSocketUrl, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;

  await waitForOpen(socket, timeoutMs);

  socket.addEventListener('message', (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!payload.id || !pending.has(payload.id)) {
      return;
    }
    const { resolve, reject, timer } = pending.get(payload.id);
    clearTimeout(timer);
    pending.delete(payload.id);
    if (payload.error) {
      reject(new Error(payload.error.message || 'CDP command failed'));
    } else {
      resolve(payload.result ?? {});
    }
  });

  socket.addEventListener('close', () => {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(new Error('CDP socket closed'));
    }
    pending.clear();
  });

  return {
    send(method, params = {}) {
      const id = nextId++;
      const message = JSON.stringify({ id, method, params });
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        socket.send(message);
      });
    },
    close() {
      try {
        socket.close();
      } catch {
        // best effort
      }
    }
  };
}

export async function fetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function waitForOpen(socket, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('CDP socket open timed out'));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('error', onError);
    };
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('CDP socket error'));
    };
    socket.addEventListener('open', onOpen);
    socket.addEventListener('error', onError);
  });
}
