import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import { ANTIGRAVITY_INFO_PLIST, ANTIGRAVITY_LANGUAGE_PACKS } from './paths.mjs';
import { isCdpPort } from './cdp-client.mjs';

const COMMON_DEBUG_PORTS = [9222, 9223, 9224, 9230, 9333];

export async function getAntigravityVersion() {
  try {
    const output = childProcess.execFileSync('plutil', ['-extract', 'CFBundleShortVersionString', 'raw', ANTIGRAVITY_INFO_PLIST], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return output.trim();
  } catch {
    return null;
  }
}

export async function hasZhCnLanguagePack() {
  try {
    const raw = await fs.readFile(ANTIGRAVITY_LANGUAGE_PACKS, 'utf8');
    const data = JSON.parse(raw);
    return Boolean(data?.['zh-cn'] || data?.['zh-CN']);
  } catch {
    return false;
  }
}

export async function discoverDebugPorts(options = {}) {
  const candidates = new Set(COMMON_DEBUG_PORTS);
  for (const value of [
    process.env.ANTIGRAVITY_DEVTOOLS_PORT,
    process.env.ANTIGRAVITY_REMOTE_DEBUGGING_PORT
  ]) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      candidates.add(parsed);
    }
  }

  for (const port of await portsFromLsof()) {
    candidates.add(port);
  }

  const live = [];
  await Promise.all(
    Array.from(candidates).map(async (port) => {
      if (await isCdpPort(port, options)) {
        live.push(port);
      }
    })
  );

  return live.sort((a, b) => a - b);
}

export async function portsFromLsof() {
  try {
    const output = childProcess.execFileSync('lsof', ['-Pan', '-c', 'Antigravity', '-iTCP', '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const ports = new Set();
    for (const line of output.split(/\r?\n/)) {
      const match = line.match(/TCP\s+(?:127\.0\.0\.1|localhost|\*|\[::1\]):(\d+)\s+\(LISTEN\)/i) || line.match(/:(\d+)\s+\(LISTEN\)/i);
      if (match) {
        const port = Number(match[1]);
        if (Number.isInteger(port) && port > 0) {
          ports.add(port);
        }
      }
    }
    return Array.from(ports);
  } catch {
    return [];
  }
}
