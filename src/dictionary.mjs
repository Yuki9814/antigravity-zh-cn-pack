import fs from 'node:fs/promises';
import path from 'node:path';

const OBJECT_FIELDS = ['attributes'];
const OPTIONAL_OBJECT_FIELDS = ['terms', 'phrases', 'exact', 'protected'];
const ARRAY_FIELDS = ['preservePatterns'];
const OPTIONAL_ARRAY_FIELDS = ['patterns'];

export async function readDictionary(root, locale = 'zh-cn') {
  const dictionaryPath = path.join(root, 'translations', `${locale}.json`);
  const raw = await fs.readFile(dictionaryPath, 'utf8');
  const duplicateKeys = findDuplicateJsonKeys(raw);
  const dictionary = JSON.parse(raw);
  const errors = validateDictionary(dictionary);
  if (duplicateKeys.length > 0) {
    errors.push(`duplicate JSON keys: ${duplicateKeys.join(', ')}`);
  }
  if (errors.length > 0) {
    const error = new Error(`Invalid translation dictionary: ${errors.join('; ')}`);
    error.errors = errors;
    throw error;
  }
  return { dictionary, raw, duplicateKeys, dictionaryPath };
}

export function validateDictionary(dictionary) {
  const errors = [];
  if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) {
    return ['dictionary must be an object'];
  }

  for (const field of OBJECT_FIELDS) {
    if (!dictionary[field] || typeof dictionary[field] !== 'object' || Array.isArray(dictionary[field])) {
      errors.push(`${field} must be an object`);
    }
  }

  for (const field of OPTIONAL_OBJECT_FIELDS) {
    if (dictionary[field] !== undefined && (!dictionary[field] || typeof dictionary[field] !== 'object' || Array.isArray(dictionary[field]))) {
      errors.push(`${field} must be an object`);
    }
  }

  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(dictionary[field])) {
      errors.push(`${field} must be an array`);
    }
  }

  for (const field of OPTIONAL_ARRAY_FIELDS) {
    if (dictionary[field] !== undefined && !Array.isArray(dictionary[field])) {
      errors.push(`${field} must be an array`);
    }
  }

  validateStringMap(dictionary.terms, 'terms', errors);
  validateStringMap(dictionary.phrases, 'phrases', errors);
  validateStringMap(dictionary.exact, 'exact', errors);

  if (dictionary.attributes && typeof dictionary.attributes === 'object') {
    for (const [attributeName, map] of Object.entries(dictionary.attributes)) {
      if (!map || typeof map !== 'object' || Array.isArray(map)) {
        errors.push(`attributes.${attributeName} must be an object`);
        continue;
      }
      validateStringMap(map, `attributes.${attributeName}`, errors);
    }
  }

  if (!dictionary.selectors || typeof dictionary.selectors !== 'object' || Array.isArray(dictionary.selectors)) {
    errors.push('selectors must be an object');
  } else if (!Array.isArray(dictionary.selectors.skip)) {
    errors.push('selectors.skip must be an array');
  }

  for (const [index, pattern] of (dictionary.preservePatterns || []).entries()) {
    if (typeof pattern !== 'string' || pattern.length === 0) {
      errors.push(`preservePatterns[${index}] must be a non-empty string`);
      continue;
    }
    try {
      new RegExp(pattern, 'gu');
    } catch (error) {
      errors.push(`preservePatterns[${index}] is invalid: ${error.message}`);
    }
  }

  for (const [index, pattern] of (dictionary.patterns || []).entries()) {
    if (!pattern || typeof pattern !== 'object' || Array.isArray(pattern)) {
      errors.push(`patterns[${index}] must be an object`);
      continue;
    }
    if (typeof pattern.source !== 'string' || pattern.source.length === 0) {
      errors.push(`patterns[${index}].source must be a non-empty string`);
    }
    if (typeof pattern.target !== 'string' || pattern.target.length === 0) {
      errors.push(`patterns[${index}].target must be a non-empty string`);
    }
    if (pattern.source) {
      try {
        new RegExp(pattern.source, 'gu');
      } catch (error) {
        errors.push(`patterns[${index}].source is invalid: ${error.message}`);
      }
    }
  }

  for (const [group, patterns] of Object.entries(dictionary.protected || {})) {
    if (!Array.isArray(patterns)) {
      errors.push(`protected.${group} must be an array`);
      continue;
    }
    for (const [index, pattern] of patterns.entries()) {
      if (typeof pattern !== 'string' || pattern.length === 0) {
        errors.push(`protected.${group}[${index}] must be a non-empty string`);
        continue;
      }
      try {
        new RegExp(pattern, 'gu');
      } catch (error) {
        errors.push(`protected.${group}[${index}] is invalid: ${error.message}`);
      }
    }
  }

  return errors;
}

function validateStringMap(map, label, errors) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    return;
  }
  for (const [key, value] of Object.entries(map)) {
    if (typeof key !== 'string' || key.length === 0) {
      errors.push(`${label} contains an empty key`);
    }
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`${label}.${key} must be a non-empty string`);
    }
  }
}

export function findDuplicateJsonKeys(raw) {
  const duplicates = [];
  const stack = [];
  let index = 0;

  while (index < raw.length) {
    const char = raw[index];

    if (char === '"') {
      const { value, end } = readJsonString(raw, index);
      index = skipWhitespace(raw, end + 1);
      if (raw[index] === ':' && stack.length > 0 && stack.at(-1).type === 'object') {
        const scope = stack.at(-1);
        const qualified = scope.path.length > 0 ? `${scope.path.join('.')}.${value}` : value;
        if (scope.keys.has(value) && !duplicates.includes(qualified)) {
          duplicates.push(qualified);
        }
        scope.keys.add(value);
      }
      continue;
    }

    if (char === '{') {
      const current = stack.at(-1);
      const pathPrefix = current?.pendingKey ? [...current.path, current.pendingKey] : current?.path ?? [];
      if (current) {
        current.pendingKey = null;
      }
      stack.push({ type: 'object', keys: new Set(), path: pathPrefix, pendingKey: null });
      index += 1;
      continue;
    }

    if (char === '}') {
      stack.pop();
      index += 1;
      continue;
    }

    if (char === '[') {
      stack.push({ type: 'array', path: stack.at(-1)?.path ?? [] });
      index += 1;
      continue;
    }

    if (char === ']') {
      stack.pop();
      index += 1;
      continue;
    }

    if (char === ':') {
      const scope = stack.at(-1);
      if (scope?.type === 'object') {
        scope.pendingKey = getPreviousString(raw, index);
      }
    }

    index += 1;
  }

  return duplicates;
}

function readJsonString(raw, start) {
  let value = '';
  let escaped = false;
  for (let index = start + 1; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      value += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      return { value, end: index };
    }
    value += char;
  }
  return { value, end: raw.length - 1 };
}

function getPreviousString(raw, colonIndex) {
  let index = colonIndex - 1;
  while (index >= 0 && /\s/.test(raw[index])) {
    index -= 1;
  }
  if (raw[index] !== '"') {
    return null;
  }
  let start = index - 1;
  let escaped = false;
  while (start >= 0) {
    const char = raw[start];
    if (escaped) {
      escaped = false;
      start -= 1;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      start -= 1;
      continue;
    }
    if (char === '"') {
      return raw.slice(start + 1, index);
    }
    start -= 1;
  }
  return null;
}

function skipWhitespace(raw, index) {
  while (index < raw.length && /\s/.test(raw[index])) {
    index += 1;
  }
  return index;
}
