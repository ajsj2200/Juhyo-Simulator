import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import { test } from 'node:test';

const readSource = (relativePath) =>
  readFileSync(path.join(cwd(), relativePath), 'utf8');

test('PresetsView diff table includes dark mode styling', () => {
  const source = readSource('src/components/views/PresetsView.jsx');

  assert.match(source, /dark:border-slate-700/);
  assert.match(source, /dark:divide-slate-700/);
  assert.match(source, /dark:bg-slate-900\/70/);
  assert.match(source, /dark:hover:bg-slate-800\/60/);
  assert.match(source, /dark:bg-rose-500\/10/);
  assert.match(source, /dark:bg-emerald-500\/10/);
});

test('SnowballAnimation includes dark sky gradients', () => {
  const source = readSource('src/components/SnowballAnimation.jsx');

  assert.match(source, /dark:from-slate-900/);
  assert.match(source, /dark:via-slate-800/);
  assert.match(source, /dark:to-slate-800/);
});

test('DashboardView includes dark insight and status styling', () => {
  const source = readSource('src/components/views/DashboardView.jsx');

  assert.match(source, /dark:from-slate-900/);
  assert.match(source, /dark:bg-slate-900\/60/);
  assert.match(source, /dark:text-slate-300/);
});

test('ProfileView includes dark range slider styling', () => {
  const source = readSource('src/components/views/ProfileView.jsx');

  assert.match(source, /dark:text-slate-200/);
  assert.match(source, /dark:bg-slate-700/);
  assert.match(source, /dark:text-slate-400/);
});

test('ComparisonView includes dark header copy styling', () => {
  const source = readSource('src/components/views/ComparisonView.jsx');

  assert.match(source, /dark:text-slate-100/);
  assert.match(source, /dark:text-slate-300/);
});
