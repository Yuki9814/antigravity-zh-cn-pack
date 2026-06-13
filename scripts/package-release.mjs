#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { rootFromImportMeta } from '../src/paths.mjs';

const root = rootFromImportMeta(import.meta.url);
const distDir = path.join(root, 'dist');
const stageDir = path.join(distDir, 'antigravity-zh-cn-pack');
const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const archiveName = `antigravity-zh-cn-pack-${packageJson.version}.zip`;
const archivePath = path.join(distDir, archiveName);
const RELEASE_ENTRIES = [
  'plugin.json',
  'package.json',
  'package-lock.json',
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'setup.sh',
  'install.command',
  'docs',
  'skills',
  'rules',
  'hooks',
  'sidecars',
  'src',
  'translations',
  'scripts'
];

async function main() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(stageDir, { recursive: true });
  for (const entry of RELEASE_ENTRIES) {
    const source = path.join(root, entry);
    if (!(await exists(source))) {
      continue;
    }
    await fs.cp(source, path.join(stageDir, entry), { recursive: true, force: true });
  }
  await fs.chmod(path.join(stageDir, 'setup.sh'), 0o755);
  await fs.chmod(path.join(stageDir, 'install.command'), 0o755);
  await zipArchive();
  await fs.rm(stageDir, { recursive: true, force: true });
  console.log(`[antigravity-zh-cn-pack] release archive: ${archivePath}`);
}

async function zipArchive() {
  const result = childProcess.spawnSync('zip', ['-qry', archivePath, 'antigravity-zh-cn-pack'], {
    cwd: distDir,
    stdio: 'inherit'
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: zip -qry ${archivePath} antigravity-zh-cn-pack`);
  }
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
