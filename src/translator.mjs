const DEFAULT_ATTRIBUTE_NAMES = ['placeholder', 'title', 'aria-label', 'aria-description', 'data-tooltip', 'alt', 'value'];
const SKIP_TAGS = new Set(['PRE', 'CODE', 'KBD', 'SAMP', 'SCRIPT', 'STYLE', 'TEXTAREA']);
const CJK_RE = /[\u3400-\u9fff]/u;
const LATIN_RE = /[A-Za-z]/u;

export function compileDictionary(dictionary) {
  const exact = { ...(dictionary.phrases ?? {}), ...(dictionary.exact ?? {}) };
  const exactEntries = Object.entries(exact).sort(sortBySourceLength);
  const patternEntries = (dictionary.patterns ?? []).map((pattern) => ({
    ...pattern,
    regex: new RegExp(pattern.source, 'gu')
  }));
  const protectedPatterns = {
    preserve: [
      ...(dictionary.preservePatterns ?? []),
      ...Object.values(dictionary.protected ?? {}).flat()
    ].map((pattern) => new RegExp(pattern, 'gu')),
    commands: (dictionary.protected?.commands ?? []).map((pattern) => new RegExp(pattern, 'gu')),
    paths: (dictionary.protected?.paths ?? []).map((pattern) => new RegExp(pattern, 'gu')),
    urls: (dictionary.protected?.urls ?? []).map((pattern) => new RegExp(pattern, 'gu')),
    brands: (dictionary.protected?.brands ?? []).map((pattern) => new RegExp(pattern, 'gu')),
    models: (dictionary.protected?.models ?? []).map((pattern) => new RegExp(pattern, 'gu'))
  };
  const attributeNames = Array.from(
    new Set([...DEFAULT_ATTRIBUTE_NAMES, ...Object.keys(dictionary.attributes ?? {})])
  );

  return {
    dictionary,
    exact,
    exactEntries,
    patternEntries,
    protectedPatterns,
    attributes: dictionary.attributes ?? {},
    attributeNames,
    skipSelectors: dictionary.selectors?.skip ?? []
  };
}

export function translateText(value, compiled) {
  if (typeof value !== 'string' || value.trim().length === 0 || shouldPreserveWhole(value, compiled)) {
    return value;
  }

  return preserveSegments(value, compiled.protectedPatterns.preserve, (segment) => translateSegment(segment, compiled));
}

export function translateAttribute(attributeName, value, compiled) {
  if (typeof value !== 'string' || value.trim().length === 0 || shouldPreserveWhole(value, compiled)) {
    return value;
  }
  const direct = compiled.attributes?.[attributeName]?.[value];
  if (direct) {
    return direct;
  }
  return translateText(value, compiled);
}

export function translateAttributes(attributes, compiled) {
  const output = { ...attributes };
  for (const attributeName of compiled.attributeNames) {
    if (Object.hasOwn(output, attributeName)) {
      output[attributeName] = translateAttribute(attributeName, output[attributeName], compiled);
    }
  }
  return output;
}

export function translateDomSnapshot(node, compiled, inheritedSkip = false) {
  const tagName = typeof node.tag === 'string' ? node.tag.toUpperCase() : '';
  const skip = inheritedSkip || SKIP_TAGS.has(tagName) || node.skip === true || node.terminal === true || node.editor === true;
  const output = { ...node };

  if (!skip && typeof output.text === 'string') {
    output.text = translateText(output.text, compiled);
  }

  if (!skip && output.attrs && typeof output.attrs === 'object') {
    output.attrs = translateAttributes(output.attrs, compiled);
  }

  if (Array.isArray(output.children)) {
    output.children = output.children.map((child) => translateDomSnapshot(child, compiled, skip));
  }

  return output;
}

export function scanUntranslated(text, compiled) {
  if (typeof text !== 'string' || text.length === 0) {
    return [];
  }
  const hits = [];
  for (const [source] of compiled.exactEntries) {
    if (source.length > 2 && text.includes(source)) {
      hits.push(source);
    }
  }
  for (const pattern of compiled.patternEntries) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(text)) {
      hits.push(pattern.label ?? pattern.source);
    }
  }
  return Array.from(new Set(hits));
}

export function detectOvertranslations(text, compiled) {
  if (typeof text !== 'string' || !CJK_RE.test(text)) {
    return [];
  }
  const hits = [];
  for (const [group, regexes] of Object.entries(compiled.protectedPatterns)) {
    if (group === 'preserve') {
      continue;
    }
    for (const regex of regexes) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = match[0];
        const start = Math.max(0, match.index - 12);
        const end = Math.min(text.length, match.index + value.length + 12);
        const context = text.slice(start, end);
        if (CJK_RE.test(context)) {
          hits.push({ group, value, context });
        }
      }
    }
  }
  return hits;
}

export function isLikelyUiEnglish(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const text = value.trim();
  return text.length > 1 && LATIN_RE.test(text) && !CJK_RE.test(text) && !isLikelyProtectedLiteral(text);
}

function translateSegment(segment, compiled) {
  const trimmed = segment.trim();
  if (trimmed && compiled.exact[trimmed]) {
    return segment.replace(trimmed, compiled.exact[trimmed]);
  }

  let output = segment;
  for (const pattern of compiled.patternEntries) {
    output = output.replace(pattern.regex, pattern.target);
  }

  for (const [source, target] of compiled.exactEntries) {
    output = output.split(source).join(target);
  }

  return output;
}

function shouldPreserveWhole(value, compiled) {
  const text = value.trim();
  if (isLikelyProtectedLiteral(text)) {
    return true;
  }
  for (const regex of compiled.protectedPatterns.preserve) {
    regex.lastIndex = 0;
    const match = regex.exec(text);
    if (match?.[0] === text) {
      return true;
    }
  }
  return false;
}

function isLikelyProtectedLiteral(text) {
  return /^https?:\/\//i.test(text)
    || /^(?:~|\/|\.\.?\/)[^\s]+$/.test(text)
    || /^[A-Za-z0-9_.-]+\.(?:mjs|cjs|js|json|md|ts|tsx|jsx|css|html|asar|plist|png|jpg|jpeg|svg|log)$/i.test(text)
    || /^(?:npm|pnpm|yarn|node|git|curl|open|lsof|plutil|rg|osascript|launchctl)(?:\s+|$)/.test(text)
    || /^(?:Command|Cmd|Ctrl|Control|Shift|Option|Alt|Enter|Escape)\s*\+/i.test(text);
}

function preserveSegments(value, regexes, transform) {
  const ranges = collectPreservedRanges(value, regexes);
  if (ranges.length === 0) {
    return transform(value);
  }

  let cursor = 0;
  let output = '';
  for (const range of ranges) {
    if (range.start > cursor) {
      output += transform(value.slice(cursor, range.start));
    }
    output += value.slice(range.start, range.end);
    cursor = range.end;
  }
  if (cursor < value.length) {
    output += transform(value.slice(cursor));
  }
  return output;
}

function collectPreservedRanges(value, regexes) {
  const ranges = [];
  for (const regex of regexes) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(value)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1;
        continue;
      }
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
    } else if (range.end > previous.end) {
      previous.end = range.end;
    }
  }
  return merged;
}

function sortBySourceLength([left], [right]) {
  return right.length - left.length;
}
