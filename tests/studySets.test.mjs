import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, test } from 'node:test';
import ts from 'typescript';

// Compile the actual storage module in memory; no test-only copy of its logic.
const source = readFileSync(new URL('../src/studySets.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { createStudySet, loadStudySets, updateStudySetNotes } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

beforeEach(() => {
  const values = new Map();
  globalThis.localStorage = {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
});

test('rejects empty and whitespace-only names without saving', () => {
  for (const name of ['', '   ', '\n\t']) {
    assert.throws(() => createStudySet(name, 'Some notes'), /Enter a name/);
  }
  assert.deepEqual(loadStudySets(), []);
});

test('trims name and preserves exact multiline notes after reloading storage', () => {
  const notes = '1789: French Revolution.\n\n  Notes with indentation.\n';
  const set = createStudySet('  French Revolution  ', notes);
  assert.equal(set.name, 'French Revolution');
  assert.equal(set.notes, notes);
  assert.deepEqual(loadStudySets(), [set]);
});

test('supports optional empty notes and independent sets with identical names', () => {
  const first = createStudySet('History', '');
  const second = createStudySet('History', 'More notes');
  assert.notEqual(first.id, second.id);
  assert.equal(loadStudySets().length, 2);
  assert.equal(loadStudySets().find(set => set.id === first.id).notes, '');
});

test('does not replace unrelated local storage', () => {
  localStorage.setItem('another-app', 'keep me');
  createStudySet('History', 'Notes');
  assert.equal(localStorage.getItem('another-app'), 'keep me');
  assert.equal(loadStudySets().length, 1);
});

test('reports quota failures instead of returning an unsaved set', () => {
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => createStudySet('History', 'Keep these notes'), /could not be saved/);
  assert.deepEqual(loadStudySets(), []);
});

test('reports corrupt stored data without overwriting it', () => {
  const key = 'history-hub.study-set.v1.bad';
  localStorage.setItem(key, '{"name":42}');
  assert.throws(loadStudySets, /could not be read/);
  assert.equal(localStorage.getItem(key), '{"name":42}');
});

test('enforces field size limits', () => {
  assert.throws(() => createStudySet('x'.repeat(151), ''), /150 characters/);
  assert.throws(() => createStudySet('History', 'x'.repeat(500001)), /500,000/);
});

test('edits notes persist without changing the name, identity, or other sets', () => {
  const set = createStudySet('French Revolution', 'Original notes');
  const other = createStudySet('Rome', 'Keep these');
  const notes = '1789: Updated notes.\n\n  Preserved indentation.\n';
  const updated = updateStudySetNotes(set.id, notes);
  assert.deepEqual(updated, { ...set, notes });
  assert.deepEqual(loadStudySets().find(item => item.id === set.id), updated);
  assert.deepEqual(loadStudySets().find(item => item.id === other.id), other);
});

test('allows saving empty notes', () => {
  const set = createStudySet('History', 'Original notes');
  updateStudySetNotes(set.id, '');
  assert.equal(loadStudySets()[0].notes, '');
});

test('failed edits leave the original saved notes untouched', () => {
  const set = createStudySet('History', 'Original notes');
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => updateStudySetNotes(set.id, 'Edited notes'), /could not be saved/);
  assert.deepEqual(loadStudySets(), [set]);
});

test('rejects missing sets and oversized edited notes', () => {
  assert.throws(() => updateStudySetNotes('missing', 'Notes'), /not found/);
  const set = createStudySet('History', 'Original notes');
  assert.throws(() => updateStudySetNotes(set.id, 'x'.repeat(500001)), /500,000/);
  assert.deepEqual(loadStudySets(), [set]);
});
