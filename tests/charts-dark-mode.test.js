import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import { test } from 'node:test';

const readSource = (relativePath) =>
  readFileSync(path.join(cwd(), relativePath), 'utf8');

test('WealthChart includes dark chart palette and tooltip styling', () => {
  const source = readSource('src/components/WealthChart.jsx');

  assert.match(source, /theme === 'dark' \? '#334155' : '#f1f5f9'/);
  assert.match(source, /theme === 'dark' \? '#cbd5e1' : '#6b7280'/);
  assert.match(source, /bg-slate-900\/95/);
});

test('ResultsView includes dark histogram colors', () => {
  const source = readSource('src/components/views/ResultsView.jsx');

  assert.match(source, /theme === 'dark' \? '#334155' : '#e5e7eb'/);
  assert.match(source, /theme === 'dark' \? '#818cf8' : '#6366f1'/);
  assert.match(source, /theme === 'dark' \? '#c084fc' : '#a855f7'/);
});

test('MonteCarloView includes dark chart colors', () => {
  const source = readSource('src/components/views/MonteCarloView.jsx');

  assert.match(source, /theme === 'dark' \? '#334155' : '#e5e7eb'/);
  assert.match(source, /theme === 'dark' \? '#818cf8' : '#6366f1'/);
});

test('CrisisView includes dark axis colors', () => {
  const source = readSource('src/components/views/CrisisView.jsx');

  assert.match(source, /theme === 'dark' \? '#334155' : '#e5e7eb'/);
  assert.match(source, /theme === 'dark' \? '#cbd5e1' : '#6b7280'/);
});

test('LoanView includes dark axis colors', () => {
  const source = readSource('src/components/views/LoanView.jsx');

  assert.match(source, /theme === 'dark' \? '#334155' : '#e5e7eb'/);
  assert.match(source, /theme === 'dark' \? '#cbd5e1' : '#6b7280'/);
});

test('AssetTrackingView includes dark tooltip styling', () => {
  const source = readSource('src/components/views/AssetTrackingView.jsx');

  assert.match(source, /theme === 'dark' \? '#334155' : '#e5e7eb'/);
  assert.match(source, /theme === 'dark' \? '#cbd5e1' : '#6b7280'/);
  assert.match(source, /bg-slate-900\/95/);
});

test('StockSearchModal includes dark axis styling', () => {
  const source = readSource('src/components/StockSearchModal.jsx');

  assert.match(source, /theme === 'dark' \? '#334155' : '#e5e7eb'/);
  assert.match(source, /theme === 'dark' \? '#cbd5e1' : '#6b7280'/);
});
