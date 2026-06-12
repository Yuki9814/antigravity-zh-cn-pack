#!/usr/bin/env node
import { discoverDebugPorts } from './antigravity.mjs';
import { injectIntoPort } from './cdp-client.mjs';
import { readDictionary } from './dictionary.mjs';
import { buildInjectedScript } from './injected-localizer.mjs';
import { rootFromImportMeta } from './paths.mjs';
import { readDisabledState, writeState } from './state.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = rootFromImportMeta(import.meta.url);

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[antigravity-zh-cn-pack] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.health) {
    const disabled = await readDisabledState();
    console.log(JSON.stringify({ ok: !disabled, disabled }, null, 2));
    return;
  }

  if (options.watch) {
    await loop(options);
    return;
  }

  const result = await runOnce(options);
  console.log(JSON.stringify(result, null, 2));
}

export async function runOnce(options = {}) {
  const disabled = await readDisabledState();
  if (disabled) {
    const state = { active: false, reason: 'disabled', disabled };
    await writeState(state);
    return state;
  }

  const { dictionary } = await readDictionary(root);
  const expression = buildInjectedScript(dictionary);
  const ports = options.ports?.length ? options.ports : await discoverDebugPorts({ timeoutMs: options.timeoutMs });
  const injections = [];
  const errors = [];

  for (const port of ports) {
    try {
      const results = await injectIntoPort(port, expression, { timeoutMs: options.timeoutMs });
      injections.push(...results);
    } catch (error) {
      errors.push({ port, error: error.message });
    }
  }

  const injectedTargets = injections.filter((item) => item.ok).length;
  const state = {
    active: injectedTargets > 0,
    ports,
    injectedTargets,
    injections,
    errors
  };
  await writeState(state);
  return state;
}

async function loop(options) {
  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  while (!stopped) {
    await runOnce(options);
    await delay(options.intervalMs);
  }
}

function parseArgs(argv) {
  const options = {
    watch: argv.includes('--watch'),
    health: argv.includes('--health'),
    intervalMs: Number(readFlag(argv, '--interval-ms') ?? 3000),
    timeoutMs: Number(readFlag(argv, '--timeout-ms') ?? 1200),
    ports: []
  };
  const ports = readFlag(argv, '--ports');
  if (ports) {
    options.ports = ports
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
  }
  return options;
}

function readFlag(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return argv[index + 1] ?? null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
