#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { INSTALL_DIR, PACKAGE_NAME, RUNTIME_DIR } from '../src/paths.mjs';
import { writeDisabledState } from '../src/state.mjs';

async function main() {
  await writeDisabledState('uninstall-requested');
  removeLaunchctlJob();
  const stopped = stopSidecars();
  await safeRemoveInstallDir();
  await fs.rm(RUNTIME_DIR, { recursive: true, force: true });
  console.log(JSON.stringify({ ok: true, removed: INSTALL_DIR, stopped }, null, 2));
}

function removeLaunchctlJob() {
  try {
    childProcess.execFileSync('launchctl', ['remove', 'local.antigravity.zhcn.sidecar'], {
      stdio: 'ignore'
    });
  } catch {
    // job may not exist
  }
}

function stopSidecars() {
  let stopped = [];
  try {
    const output = childProcess.execFileSync('ps', ['-axo', 'pid=,command='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    for (const line of output.split(/\r?\n/)) {
      if (!line.includes(PACKAGE_NAME) || !line.includes('sidecar.mjs')) {
        continue;
      }
      const match = line.trim().match(/^(\d+)\s+/);
      if (!match) {
        continue;
      }
      const pid = Number(match[1]);
      if (pid && pid !== process.pid) {
        process.kill(pid, 'SIGTERM');
        stopped.push(pid);
      }
    }
  } catch {
    stopped = [];
  }
  return stopped;
}

async function safeRemoveInstallDir() {
  if (path.basename(INSTALL_DIR) !== PACKAGE_NAME) {
    throw new Error(`Refusing to remove unexpected path: ${INSTALL_DIR}`);
  }
  await fs.rm(INSTALL_DIR, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(`[antigravity-zh-cn-pack] ${error.stack || error.message}`);
  process.exitCode = 1;
});
