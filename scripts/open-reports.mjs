#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import { REPORTS_DIR } from '../src/paths.mjs';

async function main() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
  const result = childProcess.spawnSync(opener, [REPORTS_DIR], {
    stdio: 'inherit'
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: ${opener} ${REPORTS_DIR}`);
  }
  console.log(`[antigravity-zh-cn-pack] reports: ${REPORTS_DIR}`);
}

main().catch((error) => {
  console.error(`[antigravity-zh-cn-pack] ${error.stack || error.message}`);
  process.exitCode = 1;
});
