#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { INSTALL_DIR, rootFromImportMeta } from '../src/paths.mjs';

const root = rootFromImportMeta(import.meta.url);

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  printHeader();
  checkPlatform(options);
  checkNodeVersion();
  await ensureDependencies(options);
  await run(process.execPath, ['scripts/install.mjs', ...(options.force ? ['--force'] : [])]);
  await run(process.execPath, [path.join(INSTALL_DIR, 'src', 'sidecar.mjs')]);
  if (!options.skipCheck) {
    await run('npm', ['run', 'check']);
  }
  if (!options.skipTest) {
    await run('npm', ['test']);
  }
  await run(process.execPath, ['scripts/doctor.mjs', ...(options.strict ? ['--strict'] : [])]);
  printNextSteps();
}

function printHeader() {
  console.log('[antigravity-zh-cn-pack] setup started');
  console.log(`- root: ${root}`);
  console.log(`- node: ${process.version}`);
  console.log(`- platform: ${process.platform}/${process.arch}`);
}

function checkPlatform(options) {
  if (options.skipPlatformCheck) {
    console.log('- platform check skipped');
    return;
  }
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new Error('This pack targets macOS arm64. Re-run with --skip-platform-check only for repository checks.');
  }
  if (os.release()) {
    console.log(`- macOS kernel: ${os.release()}`);
  }
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split('.')[0]);
  if (!Number.isInteger(major) || major < 22) {
    throw new Error(`Node.js 22+ is required. Current version: ${process.version}`);
  }
}

async function ensureDependencies(options) {
  if (options.skipNpmInstall) {
    console.log('- dependency install skipped');
    return;
  }
  const wsPackage = path.join(root, 'node_modules', 'ws', 'package.json');
  if ((await exists(wsPackage)) && !options.fresh) {
    console.log('- dependencies ready');
    return;
  }
  const hasLockfile = await exists(path.join(root, 'package-lock.json'));
  await run('npm', [hasLockfile ? 'ci' : 'install']);
}

async function run(command, args) {
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

function printNextSteps() {
  console.log('\n[antigravity-zh-cn-pack] setup completed');
  console.log('1. Restart Antigravity.');
  console.log('2. Open Agent mode, Settings, Plugins, Models, Browser, and Permissions once.');
  console.log('3. Run: npm run doctor:strict');
  console.log('4. If no DevTools port is detected, run: open -na /Applications/Antigravity.app --args --remote-debugging-port=9222');
}

function parseArgs(argv) {
  return {
    force: argv.includes('--force'),
    fresh: argv.includes('--fresh'),
    strict: argv.includes('--strict'),
    skipCheck: argv.includes('--skip-check'),
    skipTest: argv.includes('--skip-test'),
    skipNpmInstall: argv.includes('--skip-npm-install'),
    skipPlatformCheck: argv.includes('--skip-platform-check')
  };
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(`[antigravity-zh-cn-pack] ${error.stack || error.message}`);
  process.exitCode = 1;
});
