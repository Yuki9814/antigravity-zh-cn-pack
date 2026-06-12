import { compileDictionary, scanUntranslated, translateText } from './translator.mjs';
import { appendUntranslatedReport } from './reporting.mjs';

const TEXT_FIELDS = ['message', 'title', 'artifactTitle', 'plan', 'summary', 'body'];
const LIST_FIELDS = ['tasks', 'steps', 'items'];

export async function runZhCnHook(input, dictionary) {
  const compiled = compileDictionary(dictionary);
  const parsed = tryParseJson(input);
  if (parsed.ok) {
    const output = translatePayload(parsed.value, compiled);
    await reportUntranslated(JSON.stringify(output), compiled, 'hook-json');
    return `${JSON.stringify(output, null, 2)}\n`;
  }

  const translated = translateText(input, compiled);
  await reportUntranslated(translated, compiled, 'hook-text');
  return translated;
}

function translatePayload(value, compiled) {
  if (typeof value === 'string') {
    return translateText(value, compiled);
  }
  if (Array.isArray(value)) {
    return value.map((item) => translatePayload(item, compiled));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const output = { ...value };
  for (const field of TEXT_FIELDS) {
    if (typeof output[field] === 'string') {
      output[field] = translateText(output[field], compiled);
    }
  }
  for (const field of LIST_FIELDS) {
    if (Array.isArray(output[field])) {
      output[field] = output[field].map((item) => translatePayload(item, compiled));
    }
  }
  return output;
}

async function reportUntranslated(text, compiled, source) {
  const hits = scanUntranslated(text, compiled);
  if (hits.length === 0) {
    return;
  }
  await appendUntranslatedReport(
    hits.map((phrase) => ({
      source,
      phrase
    }))
  );
}

function tryParseJson(input) {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch {
    return { ok: false };
  }
}
