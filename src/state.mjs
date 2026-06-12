import fs from 'node:fs/promises';
import { DISABLED_FILE, RUNTIME_DIR, STATE_FILE } from './paths.mjs';

export async function ensureRuntimeDir() {
  await fs.mkdir(RUNTIME_DIR, { recursive: true });
}

export async function readDisabledState() {
  try {
    return JSON.parse(await fs.readFile(DISABLED_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export async function writeDisabledState(reason, detail = {}) {
  await ensureRuntimeDir();
  await fs.writeFile(
    DISABLED_FILE,
    `${JSON.stringify({ disabledAt: new Date().toISOString(), reason, ...detail }, null, 2)}\n`
  );
}

export async function clearDisabledState() {
  try {
    await fs.rm(DISABLED_FILE);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export async function writeState(state) {
  await ensureRuntimeDir();
  await fs.writeFile(STATE_FILE, `${JSON.stringify({ updatedAt: new Date().toISOString(), ...state }, null, 2)}\n`);
}
