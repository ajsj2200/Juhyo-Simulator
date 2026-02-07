import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cwd } from 'node:process';
import path from 'node:path';

const readSource = (relativePath) =>
  readFileSync(path.join(cwd(), relativePath), 'utf8');

test('Header includes theme toggle with sun/moon icons', () => {
  const source = readSource('src/components/layout/Header.jsx');

  assert.match(source, /toggleTheme/);
  assert.match(source, /☀️/);
  assert.match(source, /🌙/);
  assert.match(source, /aria-label="테마 전환"/);
});

test('AppLayout includes dark gradient classes', () => {
  const source = readSource('src/components/layout/AppLayout.jsx');

  assert.match(source, /dark:from-slate-900/);
  assert.match(source, /dark:to-slate-800/);
});

test('Sidebar includes dark background and text classes', () => {
  const source = readSource('src/components/layout/Sidebar.jsx');

  assert.match(source, /dark:bg-slate-900\/80/);
  assert.match(source, /dark:border-slate-800/);
  assert.match(source, /dark:text-slate-100/);
});

test('MobileNav includes dark background and text classes', () => {
  const source = readSource('src/components/layout/MobileNav.jsx');

  assert.match(source, /dark:bg-slate-900\/90/);
  assert.match(source, /dark:border-slate-800/);
  assert.match(source, /dark:text-slate-400/);
});
