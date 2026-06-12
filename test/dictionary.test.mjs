import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDuplicateJsonKeys, readDictionary, validateDictionary } from '../src/dictionary.mjs';
import { compileDictionary, detectOvertranslations, translateAttribute, translateDomSnapshot, translateText } from '../src/translator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('translation dictionary schema is valid and has no duplicate keys', async () => {
  const { dictionary, duplicateKeys } = await readDictionary(root);
  assert.deepEqual(validateDictionary(dictionary), []);
  assert.deepEqual(duplicateKeys, []);
});

test('duplicate JSON keys are reported with scope', () => {
  const duplicates = findDuplicateJsonKeys('{"terms":{"Agent":"智能体","Agent":"代理"}}');
  assert.deepEqual(duplicates, ['terms.Agent']);
});

test('exact phrases and protected segments translate safely', async () => {
  const { dictionary } = await readDictionary(root);
  const compiled = compileDictionary(dictionary);
  const input = '`Agent` New Conversation /tmp/Agent/file Antigravity';
  assert.equal(translateText(input, compiled), '`Agent` 新建会话 /tmp/Agent/file Antigravity');
});

test('variable patterns translate menu and runtime labels', async () => {
  const { dictionary } = await readDictionary(root);
  const compiled = compileDictionary(dictionary);
  assert.equal(translateText('Subagents (3)', compiled), '子智能体 (3)');
  assert.equal(translateText('Browser task: "click login"', compiled), '浏览器任务：“click login”');
  assert.equal(translateText('User uploaded image 2', compiled), '用户上传图片 2');
});

test('attributes translate through direct maps and phrase fallback', async () => {
  const { dictionary } = await readDictionary(root);
  const compiled = compileDictionary(dictionary);
  assert.equal(translateAttribute('placeholder', 'Enter a prompt for the agent', compiled), '输入智能体提示词');
  assert.equal(translateAttribute('title', 'Project Settings', compiled), '项目设置');
});

test('DOM snapshots translate text and attributes while code blocks are preserved', async () => {
  const { dictionary } = await readDictionary(root);
  const compiled = compileDictionary(dictionary);
  const snapshot = {
    tag: 'div',
    attrs: { title: 'Project Settings' },
    children: [
      { tag: 'button', text: 'Open Settings' },
      { tag: 'div', text: 'Browser Javascript Execution Policy' },
      { tag: 'code', text: 'Open Settings' },
      { tag: 'div', terminal: true, text: 'Open Settings' }
    ]
  };
  assert.deepEqual(translateDomSnapshot(snapshot, compiled), {
    tag: 'div',
    attrs: { title: '项目设置' },
    children: [
      { tag: 'button', text: '打开设置' },
      { tag: 'div', text: '浏览器 JavaScript 执行策略' },
      { tag: 'code', text: 'Open Settings' },
      { tag: 'div', terminal: true, text: 'Open Settings' }
    ]
  });
});

test('overtranslation detector reports protected literals mixed with Chinese', async () => {
  const { dictionary } = await readDictionary(root);
  const compiled = compileDictionary(dictionary);
  assert.deepEqual(detectOvertranslations('运行 npm test 完成', compiled).map((item) => item.group), ['commands']);
});
