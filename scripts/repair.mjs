#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { INSTALL_DIR, PACKAGE_NAME, RUNTIME_DIR, rootFromImportMeta } from '../src/paths.mjs';

const root = rootFromImportMeta(import.meta.url);

async function main(argv = process.argv.slice(2)) {
  const force = argv.includes('--force');
  console.log('[antigravity-zh-cn-pack] repair started');
  removeLaunchctlJob();
  const stopped = stopSidecars();
  console.log(`- stopped sidecars: ${stopped.length ? stopped.join(', ') : 'none'}`);
  await fs.rm(RUNTIME_DIR, { recursive: true, force: true });
  console.log(`- rebuilt runtime dir: ${RUNTIME_DIR}`);
  await run(process.execPath, ['scripts/install.mjs', ...(force ? ['--force'] : [])]);
  await run(process.execPath, [path.join(INSTALL_DIR, 'src', 'sidecar.mjs')]);
  await run(process.execPath, ['scripts/doctor.mjs']);
  console.log('\n[antigravity-zh-cn-pack] repair completed');
  console.log('Next: restart Antigravity, open Agent mode once, then run npm run doctor:strict.');
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

function run(command, args) {
  console.log(`\n$ ${[command, ...args].join(' ')}`);
  const result = childProcess.spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: ${[command, ...args].join(' ')}`);
  }
}

main().catch((error) => {
  console.error(`[antigravity-zh-cn-pack] ${error.stack || error.message}`);
  process.exitCode = 1;
});
