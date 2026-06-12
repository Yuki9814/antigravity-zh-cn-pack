#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import childProcess from 'node:child_process';
import { getAntigravityVersion, hasZhCnLanguagePack } from '../src/antigravity.mjs';
import { readDictionary } from '../src/dictionary.mjs';
import {
  INSTALL_DIR,
  PACKAGE_NAME,
  PLUGINS_DIR,
  REPORTS_DIR,
  RUNTIME_DIR,
  SUPPORTED_ANTIGRAVITY_VERSIONS,
  TARGET_ANTIGRAVITY_VERSION,
  rootFromImportMeta
} from '../src/paths.mjs';
import { clearDisabledState, ensureRuntimeDir } from '../src/state.mjs';

const root = rootFromImportMeta(import.meta.url);
const COPY_ENTRIES = [
  'plugin.json',
  'package.json',
  'skills',
  'rules',
  'hooks',
  'sidecars',
  'src',
  'translations',
  'scripts',
  'README.md'
];

async function main(argv = process.argv.slice(2)) {
  const force = argv.includes('--force');
  await preflight(force);
  await installPackage();
}

async function preflight(force) {
  await readDictionary(root);

  const version = await getAntigravityVersion();
  if (!SUPPORTED_ANTIGRAVITY_VERSIONS.includes(version) && !force) {
    throw new Error(`Antigravity version ${version ?? 'unknown'} is not supported (${SUPPORTED_ANTIGRAVITY_VERSIONS.join(', ')}). Re-run with --force after review.`);
  }

  if (!(await hasZhCnLanguagePack()) && !force) {
    throw new Error('Antigravity zh-cn language pack was not found. Install the official language pack first or re-run with --force.');
  }

  await fs.mkdir(PLUGINS_DIR, { recursive: true });
  await fs.access(PLUGINS_DIR, fs.constants.W_OK);
}

async function installPackage() {
  removeLaunchctlJob();
  await ensureRuntimeDir();
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const previous = await safeStat(INSTALL_DIR);
  if (previous) {
    await fs.rm(INSTALL_DIR, { recursive: true, force: true });
  }
  await fs.mkdir(INSTALL_DIR, { recursive: true });

  const installedFiles = [];
  for (const entry of COPY_ENTRIES) {
    const source = path.join(root, entry);
    if (!(await safeStat(source))) {
      continue;
    }
    const target = path.join(INSTALL_DIR, entry);
    await fs.cp(source, target, { recursive: true, force: true });
    installedFiles.push(entry);
  }

  const manifest = {
    package: PACKAGE_NAME,
    installedAt: new Date().toISOString(),
    sourceRoot: root,
    targetRoot: INSTALL_DIR,
    installedFiles,
    antigravityVersion: await getAntigravityVersion()
  };
  await fs.writeFile(path.join(INSTALL_DIR, '.install-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(RUNTIME_DIR, `install-manifest-${Date.now()}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  await clearDisabledState();
  console.log(JSON.stringify({ ok: true, installedTo: INSTALL_DIR, manifest }, null, 2));
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

async function safeStat(targetPath) {
  try {
    return await fs.stat(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(`[antigravity-zh-cn-pack] ${error.stack || error.message}`);
  process.exitCode = 1;
});
