import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_NAME = 'antigravity-zh-cn-pack';
export const TARGET_ANTIGRAVITY_VERSION = '2.0.11';
export const SUPPORTED_ANTIGRAVITY_VERSIONS = ['2.0.11', '2.1.4'];
export const ANTIGRAVITY_APP_PATH = '/Applications/Antigravity.app';
export const ANTIGRAVITY_INFO_PLIST = path.join(ANTIGRAVITY_APP_PATH, 'Contents', 'Info.plist');
export const ANTIGRAVITY_LANGUAGE_PACKS = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Antigravity',
  'languagepacks.json'
);
export const GEMINI_CONFIG_DIR = path.join(os.homedir(), '.gemini', 'config');
export const PLUGINS_DIR = path.join(GEMINI_CONFIG_DIR, 'plugins');
export const INSTALL_DIR = path.join(PLUGINS_DIR, PACKAGE_NAME);
export const RUNTIME_DIR = path.join(os.homedir(), '.gemini', 'antigravity', PACKAGE_NAME);
export const STATE_FILE = path.join(RUNTIME_DIR, 'state.json');
export const DISABLED_FILE = path.join(RUNTIME_DIR, 'disabled.json');
export const REPORTS_DIR = path.join(RUNTIME_DIR, 'reports');
export const UNTRANSLATED_REPORT = path.join(REPORTS_DIR, 'untranslated.json');
export const OVERTRANSLATED_REPORT = path.join(REPORTS_DIR, 'overtranslated.json');
export const UI_AUDIT_REPORT = path.join(REPORTS_DIR, 'ui-audit.json');

export function rootFromImportMeta(importMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), '..');
}

export function pathInsideRoot(root, ...segments) {
  return path.join(root, ...segments);
}
