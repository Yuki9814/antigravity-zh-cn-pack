#!/usr/bin/env node
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverDebugPorts } from '../src/antigravity.mjs';
import { evaluateExpressionOnPort } from '../src/cdp-client.mjs';
import { readDictionary } from '../src/dictionary.mjs';
import { UI_AUDIT_REPORT, OVERTRANSLATED_REPORT, REPORTS_DIR, rootFromImportMeta, INSTALL_DIR } from '../src/paths.mjs';
import { compileDictionary, detectOvertranslations, isLikelyUiEnglish, scanUntranslated } from '../src/translator.mjs';

const root = rootFromImportMeta(import.meta.url);

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[antigravity-zh-cn-pack] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}

export async function main(argv = process.argv.slice(2)) {
  const local = argv.includes('--local');
  const source = readFlag(argv, '--source') ?? 'live,bundle';
  const pluginRoot = local ? root : INSTALL_DIR;
  const report = await auditUi({ pluginRoot, sources: source.split(',').map((item) => item.trim()).filter(Boolean) });
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(UI_AUDIT_REPORT, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OVERTRANSLATED_REPORT, `${JSON.stringify(report.overtranslatedCandidates, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.summary.overtranslatedCount === 0 ? 0 : 1;
}

export async function auditUi({ pluginRoot = root, sources = ['live', 'bundle'] } = {}) {
  const { dictionary } = await readDictionary(pluginRoot);
  const compiled = compileDictionary(dictionary);
  const live = sources.includes('live') ? await collectLiveText(compiled) : [];
  const bundle = sources.includes('bundle') ? await collectBundleText(compiled) : [];
  const allItems = [...live, ...bundle];
  const missingTranslations = [];
  const protectedCandidates = [];
  const overtranslatedCandidates = [];
  const menuHierarchyCandidates = [];

  for (const item of allItems) {
    const value = item.value?.trim();
    if (!value) {
      continue;
    }
    const over = detectOvertranslations(value, compiled);
    for (const hit of over) {
      overtranslatedCandidates.push({ ...item, ...hit });
    }
    const protectedCandidate = isProtectedCandidate(value);
    const unknown = scanUntranslated(value, compiled);
    if (!protectedCandidate && (unknown.length > 0 || (isLikelyUiEnglish(value) && !compiled.exact[value]))) {
      missingTranslations.push({ ...item, hits: unknown });
    }
    if (protectedCandidate) {
      protectedCandidates.push(item);
    }
    if (isMenuCandidate(item, value)) {
      menuHierarchyCandidates.push(item);
    }
  }

  return {
    ok: overtranslatedCandidates.length === 0,
    generatedAt: new Date().toISOString(),
    sources,
    summary: {
      liveItems: live.length,
      bundleItems: bundle.length,
      missingCount: missingTranslations.length,
      protectedCandidateCount: protectedCandidates.length,
      overtranslatedCount: overtranslatedCandidates.length,
      menuCandidateCount: menuHierarchyCandidates.length,
      exactCount: Object.keys(compiled.exact).length,
      patternCount: compiled.patternEntries.length
    },
    missingTranslations: dedupeByValue(missingTranslations).slice(0, 500),
    protectedCandidates: dedupeByValue(protectedCandidates).slice(0, 300),
    overtranslatedCandidates: dedupeByValue(overtranslatedCandidates).slice(0, 200),
    menuHierarchyCandidates: dedupeByValue(menuHierarchyCandidates).slice(0, 400)
  };
}

async function collectLiveText(compiled) {
  const ports = await discoverDebugPorts({ timeoutMs: 900 });
  const expr = `(() => {
    const items = [];
    const seen = new Set();
    const add = (kind, value, meta = {}) => {
      value = (value || "").replace(/\\s+/g, " ").trim();
      if (!value || !/[A-Za-z\\u3400-\\u9fff]/.test(value)) return;
      const key = kind + ":" + value;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ kind, value, ...meta });
    };
    add("page-title", document.title, { url: location.href });
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode() && items.length < 1000) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || parent.closest('pre,code,kbd,samp,script,style,textarea,.monaco-editor,.cm-editor,.xterm,[contenteditable="true"],[data-ag-zh-skip]')) continue;
      add("text", node.nodeValue, { tag: parent.tagName, role: parent.getAttribute("role"), id: parent.id || null });
    }
    const attrNames = ["aria-label", "title", "placeholder", "data-tooltip", "alt", "value"];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (el.closest('pre,code,kbd,samp,script,style,textarea,.monaco-editor,.cm-editor,.xterm,[contenteditable="true"],[data-ag-zh-skip]')) continue;
      for (const name of attrNames) {
        if (el.hasAttribute(name)) add("attribute:" + name, el.getAttribute(name), { tag: el.tagName, role: el.getAttribute("role"), id: el.id || null });
      }
      if (el.shadowRoot) {
        add("shadow-root", el.tagName, { tag: el.tagName, id: el.id || null });
      }
      if (items.length >= 1500) break;
    }
    if (window.__ANTIGRAVITY_ZH_CN_PACK__ && typeof window.__ANTIGRAVITY_ZH_CN_PACK__.getOvertranslated === "function") {
      for (const item of window.__ANTIGRAVITY_ZH_CN_PACK__.getOvertranslated()) {
        add("overtranslated-runtime", item.after || item.context || item.value || "", { tag: item.tag || null, role: null, id: null });
      }
    }
    return items;
  })()`;
  const items = [];
  for (const port of ports) {
    const results = await evaluateExpressionOnPort(port, expr, { timeoutMs: 1200 });
    for (const result of results) {
      if (result.ok && Array.isArray(result.result)) {
        items.push(...result.result.map((item) => ({ ...item, source: 'live', port, targetId: result.targetId })));
      }
    }
  }
  return items.filter((item) => !isAlreadyCovered(item.value, compiled));
}

async function collectBundleText(compiled) {
  const assets = await fetchAssets();
  const items = [];
  for (const [asset, body] of Object.entries(assets)) {
    const fields = ['label', 'title', 'description', 'placeholder', 'content', 'primaryCtaText', 'secondaryCtaText'];
    for (const field of fields) {
      const re = new RegExp(`${field}:"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`, 'g');
      for (const match of body.matchAll(re)) {
        const value = unescapeJsString(match[1]);
        if (value.length > 1 && value.length < 240 && /[A-Za-z]/.test(value) && !isNoise(value)) {
          items.push({ source: 'bundle', asset, kind: field, value });
        }
      }
    }
  }
  return dedupeByValue(items).filter((item) => !isAlreadyCovered(item.value, compiled));
}

async function fetchAssets() {
  const page = await get('https://127.0.0.1:62122/');
  const assetUrls = [...page.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], 'https://127.0.0.1:62122/').href)
    .filter((url) => /\/(?:main|tailwind-config)\.js$/.test(url));
  const output = {};
  for (const url of assetUrls) {
    output[path.basename(url)] = await get(url);
  }
  return output;
}

function get(url) {
  return new Promise((resolve) => {
    const request = https.get(url, { rejectUnauthorized: false, timeout: 5000 }, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => resolve(data));
    });
    request.on('error', () => resolve(''));
    request.on('timeout', () => request.destroy(new Error('timeout')));
  });
}

function isAlreadyCovered(value, compiled) {
  return Boolean(compiled.exact[value])
    || Object.values(compiled.attributes).some((map) => Object.hasOwn(map, value))
    || scanUntranslated(value, compiled).length > 0;
}

function isProtectedCandidate(value) {
  return /^(?:https?:\/\/|(?:~|\/|\.\.?\/)|(?:npm|pnpm|yarn|node|git|curl|open|lsof|plutil|rg)\s)/.test(value)
    || /^(?:[a-z]+_)+[a-z]+(?:\s+or\s+(?:[a-z]+_)+[a-z]+)*$/.test(value)
    || /^my-[a-z0-9-]+$/.test(value)
    || /^e\.g\.,?\s+(?:https?:\/\/|\/|npm\s|curl|[A-Za-z0-9_.-]+$)/.test(value)
    || /^\[[A-Za-z0-9_.:-]+\]$/.test(value)
    || /^\d+(?:h|d|mo)$/.test(value)
    || /^[a-z]+(?:-[a-z]+)+$/.test(value)
    || /^[A-Z][A-Za-z]+(?:\s+(?:A|a|And|and|The|the|Of|of|To|to|In|in|For|for|With|with|On|on|AI|GPT|PPT|[A-Z][A-Za-z-]+)){2,}$/.test(value)
    || /\b(?:Gemini|Antigravity|antigravity|Google Drive|Chrome|Chromium|MCP|CDP|Node\.js|macOS)\b/.test(value);
}

function isMenuCandidate(item, value) {
  return /menu|label|title|aria-label|placeholder/i.test(item.kind)
    || /^(?:Open|New|Toggle|Select|Close|Copy|Delete|Edit|Run|Stop|Retry|Accept|Reject|Show|Hide|Configure|Enable|Disable|Add|Remove)\b/.test(value)
    || /Settings|Permissions|Customizations|Browser|Models|Plugins|Skills|Rules|Sidecars|Terminal|Conversation|Workspace/.test(value);
}

function isNoise(value) {
  return /^(?:\\|\\[|[A-Za-z0-9_./:@?&=%#-]+|#[A-Fa-f0-9]{3,8}|var\(|--)/.test(value)
    || /(?:className|function|return|throw|new Map|new Set|F\.createElement|\\n|\$\{)/.test(value)
    || /^(?:description)$/.test(value)
    || /(?:foreground|background|padding|stroke|border|MathNode|Token|Iterator|Spliterator|ELK|Eclipse|LaTeX|Render math|Render display math|markup language|HTML features|user-specified sizes)/i.test(value);
}

function dedupeByValue(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = `${item.kind}:${item.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
  }
  return output;
}

function unescapeJsString(value) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value;
  }
}

function readFlag(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1] ?? null;
}
