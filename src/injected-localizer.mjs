export function buildInjectedScript(dictionary) {
  const payload = JSON.stringify(dictionary);
  return `(() => {
  const dictionary = ${payload};
  const current = window.__ANTIGRAVITY_ZH_CN_PACK__;
  if (current && current.version === dictionary.version && current.active && current.schema === "v2") {
    current.translateNow();
    return { ok: true, status: "already-active", version: dictionary.version, schema: "v2" };
  }
  if (current && typeof current.stop === "function") {
    current.stop();
  }

  const CJK_RE = /[\\u3400-\\u9fff]/u;
  const LATIN_RE = /[A-Za-z]/u;
  const defaultAttributes = ["placeholder", "title", "aria-label", "aria-description", "data-tooltip", "alt", "value"];
  const attributeNames = Array.from(new Set(defaultAttributes.concat(Object.keys(dictionary.attributes || {}))));
  const exact = Object.assign({}, dictionary.phrases || {}, dictionary.exact || {});
  const exactEntries = Object.entries(exact).sort((a, b) => b[0].length - a[0].length);
  const patternEntries = (dictionary.patterns || []).map((pattern) => Object.assign({}, pattern, { regex: new RegExp(pattern.source, "gu") }));
  const protectedGroups = dictionary.protected || {};
  const preserveRegexes = (dictionary.preservePatterns || []).concat(Object.values(protectedGroups).flat()).map((pattern) => new RegExp(pattern, "gu"));
  const overRegexes = Object.fromEntries(Object.entries(protectedGroups).map(([group, patterns]) => [group, patterns.map((pattern) => new RegExp(pattern, "gu"))]));
  const skipSelector = (dictionary.selectors && dictionary.selectors.skip || []).join(",");
  const skipTags = new Set(["PRE", "CODE", "KBD", "SAMP", "SCRIPT", "STYLE", "TEXTAREA"]);
  const observers = [];
  const overtranslated = [];

  function isProtectedLiteral(text) {
    return /^https?:\\/\\//i.test(text)
      || /^(?:~|\\/|\\.\\.?\\/)[^\\s]+$/.test(text)
      || /^[A-Za-z0-9_.-]+\\.(?:mjs|cjs|js|json|md|ts|tsx|jsx|css|html|asar|plist|png|jpg|jpeg|svg|log)$/i.test(text)
      || /^(?:npm|pnpm|yarn|node|git|curl|open|lsof|plutil|rg|osascript|launchctl)(?:\\s+|$)/.test(text)
      || /^(?:Command|Cmd|Ctrl|Control|Shift|Option|Alt|Enter|Escape)\\s*\\+/i.test(text);
  }

  function collectRanges(value, regexes) {
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
      const previous = merged[merged.length - 1];
      if (!previous || range.start > previous.end) {
        merged.push({ start: range.start, end: range.end });
      } else if (range.end > previous.end) {
        previous.end = range.end;
      }
    }
    return merged;
  }

  function preserveSegments(value, transform) {
    const ranges = collectRanges(value, preserveRegexes);
    if (ranges.length === 0) {
      return transform(value);
    }
    let cursor = 0;
    let output = "";
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

  function translateSegment(segment) {
    const trimmed = segment.trim();
    if (trimmed && exact[trimmed]) {
      return segment.replace(trimmed, exact[trimmed]);
    }
    let output = segment;
    for (const pattern of patternEntries) {
      output = output.replace(pattern.regex, pattern.target);
    }
    for (const [source, target] of exactEntries) {
      output = output.split(source).join(target);
    }
    return output;
  }

  function translateText(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return value;
    }
    const trimmed = value.trim();
    if (isProtectedLiteral(trimmed)) {
      return value;
    }
    return preserveSegments(value, translateSegment);
  }

  function recordOvertranslation(value, next, element, source) {
    if (value === next || !CJK_RE.test(next)) {
      return;
    }
    for (const [group, regexes] of Object.entries(overRegexes)) {
      if (group === "brands") {
        continue;
      }
      for (const regex of regexes) {
        regex.lastIndex = 0;
        const match = regex.exec(next);
        if (match) {
          overtranslated.push({
            at: new Date().toISOString(),
            source,
            group,
            before: value,
            after: next,
            tag: element && element.tagName ? element.tagName : null
          });
          return;
        }
      }
    }
  }

  function shouldSkipElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    if (skipTags.has(element.tagName)) {
      return true;
    }
    if (element.closest && element.closest('[data-ag-zh-skip], .monaco-editor, .cm-editor, .xterm, [data-language], [contenteditable="true"]')) {
      return true;
    }
    if (!skipSelector) {
      return false;
    }
    return Boolean(element.closest(skipSelector));
  }

  function translateAttributes(element) {
    for (const attributeName of attributeNames) {
      if (!element.hasAttribute(attributeName)) {
        continue;
      }
      const value = element.getAttribute(attributeName);
      const direct = dictionary.attributes && dictionary.attributes[attributeName] && dictionary.attributes[attributeName][value];
      const next = direct || translateText(value);
      if (next !== value) {
        recordOvertranslation(value, next, element, "attribute:" + attributeName);
        element.setAttribute(attributeName, next);
      }
    }
  }

  function translateNode(root) {
    if (!root) {
      return;
    }
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (!shouldSkipElement(parent)) {
        const value = root.nodeValue;
        const next = translateText(value);
        if (next !== value) {
          recordOvertranslation(value, next, parent, "text");
          root.nodeValue = next;
        }
      }
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      return;
    }
    if (root.nodeType === Node.ELEMENT_NODE) {
      if (shouldSkipElement(root)) {
        return;
      }
      translateAttributes(root);
      if (root.shadowRoot) {
        observeRoot(root.shadowRoot);
        translateNode(root.shadowRoot);
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (!shouldSkipElement(node)) {
          translateAttributes(node);
          if (node.shadowRoot) {
            observeRoot(node.shadowRoot);
            translateNode(node.shadowRoot);
          }
        }
      } else if (node.nodeType === Node.TEXT_NODE && !shouldSkipElement(node.parentElement)) {
        const value = node.nodeValue;
        const next = translateText(value);
        if (next !== value) {
          recordOvertranslation(value, next, node.parentElement, "text");
          node.nodeValue = next;
        }
      }
      node = walker.nextNode();
    }
  }

  function observeRoot(root) {
    if (!root || root.__ANTIGRAVITY_ZH_CN_OBSERVED__) {
      return;
    }
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") {
          translateNode(record.target);
        } else if (record.type === "attributes") {
          translateAttributes(record.target);
        } else {
          for (const node of record.addedNodes) {
            translateNode(node);
          }
        }
      }
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributeNames
    });
    root.__ANTIGRAVITY_ZH_CN_OBSERVED__ = true;
    observers.push(observer);
  }

  function translateNow() {
    translateNode(document.documentElement || document.body);
  }

  observeRoot(document.documentElement || document.body);
  translateNow();

  window.__ANTIGRAVITY_ZH_CN_PACK__ = {
    active: true,
    version: dictionary.version,
    schema: "v2",
    translateNow,
    getOvertranslated() {
      return overtranslated.slice(-200);
    },
    stop() {
      for (const observer of observers) {
        observer.disconnect();
      }
      this.active = false;
    }
  };

  return { ok: true, status: "installed", version: dictionary.version, schema: "v2" };
})()`;
}
