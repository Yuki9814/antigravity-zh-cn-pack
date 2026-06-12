#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { discoverDebugPorts, getAntigravityVersion, hasZhCnLanguagePack } from '../src/antigravity.mjs';
import { evaluateExpressionOnPort } from '../src/cdp-client.mjs';
import { readDictionary } from '../src/dictionary.mjs';
import { auditUi } from './audit-ui.mjs';
import {
  INSTALL_DIR,
  STATE_FILE,
  SUPPORTED_ANTIGRAVITY_VERSIONS,
  TARGET_ANTIGRAVITY_VERSION,
  UI_AUDIT_REPORT,
  OVERTRANSLATED_REPORT,
  UNTRANSLATED_REPORT,
  rootFromImportMeta
} from '../src/paths.mjs';
import { readState, writeDisabledState } from '../src/state.mjs';

const root = rootFromImportMeta(import.meta.url);

async function main(argv = process.argv.slice(2)) {
  const local = argv.includes('--local');
  const pluginRoot = local ? root : INSTALL_DIR;
  const result = await verify(pluginRoot);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}

export async function verify(pluginRoot) {
  const checks = [];
  const warnings = [];
  const version = await getAntigravityVersion();
  const versionOk = SUPPORTED_ANTIGRAVITY_VERSIONS.includes(version);
  checks.push({ name: 'antigravity-version', ok: versionOk, expected: SUPPORTED_ANTIGRAVITY_VERSIONS, primaryTarget: TARGET_ANTIGRAVITY_VERSION, actual: version });
  if (!versionOk) {
    await writeDisabledState('unsupported-antigravity-version', { expected: SUPPORTED_ANTIGRAVITY_VERSIONS, actual: version });
  }

  const languagePack = await hasZhCnLanguagePack();
  checks.push({ name: 'zh-cn-language-pack', ok: languagePack });

  checks.push({ name: 'plugin-root', ok: Boolean(await safeStat(pluginRoot)), path: pluginRoot });

  try {
    await readDictionary(pluginRoot);
    checks.push({ name: 'dictionary', ok: true });
  } catch (error) {
    checks.push({ name: 'dictionary', ok: false, error: error.message });
  }

  const state = await readState();
  checks.push({ name: 'sidecar-state', ok: Boolean(state), path: STATE_FILE, state });

  const ports = await discoverDebugPorts({ timeoutMs: 700 });
  checks.push({ name: 'cdp-ports', ok: ports.length > 0, ports });
  if (ports.length === 0) {
    warnings.push('No Antigravity DevTools port detected. UI injection waits until a port is available.');
  }

  const injectionStatus = [];
  if (ports.length > 0) {
    for (const port of ports) {
      const status = await evaluateExpressionOnPort(
        port,
        'window.__ANTIGRAVITY_ZH_CN_PACK__ ? { active: window.__ANTIGRAVITY_ZH_CN_PACK__.active, version: window.__ANTIGRAVITY_ZH_CN_PACK__.version } : null',
        { timeoutMs: 900 }
      );
      injectionStatus.push(...status);
    }
  }

  checks.push({
    name: 'injection-status',
    ok: injectionStatus.length === 0 || injectionStatus.some((item) => item.ok && item.result?.active),
    status: injectionStatus
  });

  let audit = null;
  try {
    audit = await auditUi({ pluginRoot, sources: ['live', 'bundle'] });
    await fs.mkdir(path.dirname(UI_AUDIT_REPORT), { recursive: true });
    await fs.writeFile(UI_AUDIT_REPORT, `${JSON.stringify(audit, null, 2)}\n`);
    await fs.writeFile(OVERTRANSLATED_REPORT, `${JSON.stringify(audit.overtranslatedCandidates, null, 2)}\n`);
    checks.push({
      name: 'ui-audit',
      ok: audit.summary.overtranslatedCount === 0,
      summary: audit.summary,
      report: UI_AUDIT_REPORT
    });
  } catch (error) {
    checks.push({ name: 'ui-audit', ok: false, error: error.message, report: UI_AUDIT_REPORT });
  }

  const untranslatedReportExists = Boolean(await safeStat(UNTRANSLATED_REPORT));
  checks.push({ name: 'untranslated-report', ok: true, path: UNTRANSLATED_REPORT, exists: untranslatedReportExists });
  checks.push({ name: 'overtranslated-report', ok: true, path: OVERTRANSLATED_REPORT, exists: Boolean(await safeStat(OVERTRANSLATED_REPORT)) });

  return {
    ok: checks.filter((check) => check.name !== 'cdp-ports' && check.name !== 'injection-status').every((check) => check.ok),
    checkedAt: new Date().toISOString(),
    pluginRoot,
    checks,
    warnings,
    auditSummary: audit?.summary ?? null
  };
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
