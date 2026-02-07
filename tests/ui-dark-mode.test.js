import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import { test } from 'node:test';

const readSource = (relativePath) =>
  readFileSync(path.join(cwd(), relativePath), 'utf8');

test('Card includes dark variants for default and gradient cards', () => {
  const source = readSource('src/components/ui/Card.jsx');

  assert.match(source, /default:[\s\S]*dark:bg-slate-900\/80[\s\S]*dark:border-slate-700/);
  assert.match(
    source,
    /blue:[\s\S]*dark:from-slate-900\/70[\s\S]*dark:to-slate-800\/50[\s\S]*dark:border-slate-700/,
  );
});

test('Modal includes dark overlay and text styles', () => {
  const source = readSource('src/components/ui/Modal.jsx');

  assert.match(source, /dark:bg-black\/60/);
  assert.match(source, /dark:bg-slate-900/);
  assert.match(source, /dark:border-slate-700/);
  assert.match(source, /dark:text-slate-100/);
  assert.match(source, /dark:text-slate-300/);
  assert.match(source, /dark:hover:bg-slate-800/);
});

test('CollapsibleSection includes dark background and border styles', () => {
  const source = readSource('src/components/ui/CollapsibleSection.jsx');

  assert.match(source, /dark:bg-slate-900\/60/);
  assert.match(source, /dark:border-slate-700/);
  assert.match(source, /dark:hover:bg-slate-900\/60/);
  assert.match(source, /dark:bg-slate-900\/70/);
});

test('InputGroup includes dark input styling', () => {
  const source = readSource('src/components/InputGroup.jsx');

  assert.match(source, /dark:text-slate-200/);
  assert.match(source, /dark:bg-slate-800/);
  assert.match(source, /dark:border-slate-600/);
  assert.match(source, /dark:text-slate-100/);
  assert.match(source, /dark:placeholder:text-slate-400/);
  assert.match(source, /dark:text-slate-400/);
});
