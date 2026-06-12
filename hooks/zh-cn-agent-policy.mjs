#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { readDictionary } from '../src/dictionary.mjs';
import { runZhCnHook } from '../src/hook-runner.mjs';
import { rootFromImportMeta } from '../src/paths.mjs';

const root = rootFromImportMeta(import.meta.url);

async function main() {
  const input = readFileSync(0, 'utf8');
  const { dictionary } = await readDictionary(root);
  const output = await runZhCnHook(input, dictionary);
  process.stdout.write(output);
}

main().catch((error) => {
  console.error(`[antigravity-zh-cn-pack] ${error.stack || error.message}`);
  process.exitCode = 1;
});
