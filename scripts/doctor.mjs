#!/usr/bin/env node
import childProcess from 'node:child_process';
import path from 'node:path';
import { rootFromImportMeta } from '../src/paths.mjs';

const root = rootFromImportMeta(import.meta.url);

async function main(argv = process.argv.slice(2)) {
  const strict = argv.includes('--strict');
  const local = argv.includes('--local');
  const verify = runVerify({ strict, local });
  const result = parseJson(verify.stdout);
  if (!result) {
    process.stdout.write(verify.stdout);
    process.stderr.write(verify.stderr);
    process.exitCode = verify.status || 1;
    return;
  }

  printReport(result);
  process.exitCode = result.ok ? 0 : 1;
}

function runVerify({ strict, local }) {
  const args = ['scripts/verify.mjs'];
  if (strict) {
    args.push('--strict');
  }
  if (local) {
    args.push('--local');
  }
  const result = childProcess.spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8'
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function printReport(result) {
  console.log('Antigravity 简中包诊断');
  console.log(`模式: ${result.strict ? 'strict' : 'normal'}`);
  console.log(`插件目录: ${result.pluginRoot}`);
  console.log(`结果: ${result.ok ? '通过' : '需要处理'}`);
  console.log('');

  for (const check of result.checks || []) {
    console.log(`${check.ok ? '[ok]' : '[fail]'} ${renderCheck(check)}`);
  }

  const hints = buildHints(result);
  if (hints.length > 0) {
    console.log('\n处理提示');
    for (const hint of hints) {
      console.log(`- ${hint}`);
    }
  }

  if (result.auditSummary) {
    console.log('\n审计摘要');
    console.log(`- 漏翻候选: ${result.auditSummary.missingCount}`);
    console.log(`- 误翻候选: ${result.auditSummary.overtranslatedCount}`);
    console.log(`- 词库精确短语: ${result.auditSummary.exactCount}`);
    console.log(`- 变量模式: ${result.auditSummary.patternCount}`);
  }
}

function renderCheck(check) {
  switch (check.name) {
    case 'antigravity-version':
      return `Antigravity 版本 ${check.actual ?? 'unknown'}，支持 ${check.expected?.join(', ')}`;
    case 'zh-cn-language-pack':
      return '官方 zh-cn 语言包';
    case 'plugin-root':
      return `插件目录 ${check.path}`;
    case 'dictionary':
      return check.ok ? `词库结构 ${check.version ?? ''}`.trim() : `词库结构: ${check.error}`;
    case 'sidecar-state':
      return check.state ? `sidecar 状态 ${check.state.active ? 'active' : 'pending'} ${formatVersionPair(check)}`.trim() : 'sidecar 状态尚未生成';
    case 'cdp-ports':
      return `DevTools 端口 ${check.ports?.length ? check.ports.join(', ') : '未发现'}`;
    case 'injection-status':
      return `UI 注入状态 ${formatInjectionVersions(check)}`.trim();
    case 'ui-audit':
      return check.ok ? `UI 审计 ${check.report}` : `UI 审计: ${check.error ?? check.report}`;
    case 'untranslated-report':
      return `漏翻报告 ${check.exists ? '存在' : '暂无'}`;
    case 'overtranslated-report':
      return `误翻报告 ${check.exists ? '存在' : '暂无'}`;
    default:
      return check.name;
  }
}

function formatVersionPair(check) {
  if (!check.expectedVersion && !check.actualVersion) {
    return '';
  }
  return `(当前 ${check.actualVersion ?? 'unknown'} / 期望 ${check.expectedVersion ?? 'unknown'})`;
}

function formatInjectionVersions(check) {
  const versions = (check.status || [])
    .map((item) => item?.result?.version)
    .filter(Boolean);
  if (versions.length === 0) {
    return check.expectedVersion ? `(期望 ${check.expectedVersion})` : '';
  }
  return `(当前 ${[...new Set(versions)].join(', ')} / 期望 ${check.expectedVersion ?? 'unknown'})`;
}

function buildHints(result) {
  const failed = new Map((result.checks || []).filter((check) => !check.ok).map((check) => [check.name, check]));
  const hints = [];
  if (failed.has('antigravity-version')) {
    hints.push('Antigravity 版本不在支持清单内；确认变更后运行 npm run setup -- --force。');
  }
  if (failed.has('zh-cn-language-pack')) {
    hints.push('缺少官方 zh-cn 语言包；先安装官方简中语言包，或运行 npm run setup -- --force。');
  }
  if (failed.has('plugin-root')) {
    hints.push('插件目录不存在；运行 npm run setup。');
  }
  if (failed.has('dictionary')) {
    hints.push('词库 JSON 无效；运行 npm run check 定位语法问题。');
  }
  if (failed.has('sidecar-state')) {
    hints.push('重启 Antigravity 后再运行 npm run doctor:strict。');
  }
  if (failed.has('cdp-ports')) {
    hints.push('未发现 DevTools 端口；可用 open -na /Applications/Antigravity.app --args --remote-debugging-port=9222 启动。');
  }
  if (failed.has('injection-status')) {
    hints.push('UI 注入未激活；确认 Antigravity 已重启，且 Agent mode 已打开。');
  }
  if (failed.has('ui-audit')) {
    hints.push('UI 审计异常；运行 npm run audit 查看 reports/ui-audit.json。');
  }
  for (const warning of result.warnings || []) {
    hints.push(warning);
  }
  return [...new Set(hints)];
}

main().catch((error) => {
  console.error(`[antigravity-zh-cn-pack] ${error.stack || error.message}`);
  process.exitCode = 1;
});
