import fs from 'node:fs/promises';
import { REPORTS_DIR, UNTRANSLATED_REPORT } from './paths.mjs';

export async function appendUntranslatedReport(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return;
  }
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  let current = [];
  try {
    current = JSON.parse(await fs.readFile(UNTRANSLATED_REPORT, 'utf8'));
    if (!Array.isArray(current)) {
      current = [];
    }
  } catch {
    current = [];
  }
  current.push(
    ...entries.map((entry) => ({
      firstSeenAt: new Date().toISOString(),
      ...entry
    }))
  );
  await fs.writeFile(UNTRANSLATED_REPORT, `${JSON.stringify(current, null, 2)}\n`);
}
