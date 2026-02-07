import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import { test } from 'node:test';

const readSource = (relativePath) =>
  readFileSync(path.join(cwd(), relativePath), 'utf8');

test('PersonCard includes dark background and schedule styling', () => {
  const source = readSource('src/components/PersonCard.jsx');

  assert.match(source, /dark:bg-slate-900\/80/);
  assert.match(source, /dark:bg-slate-800\/60/);
  assert.match(source, /dark:text-slate-300/);
});

test('StatCard includes dark gradient and text variants', () => {
  const source = readSource('src/components/StatCard.jsx');

  assert.match(source, /dark:from-slate-900\/70/);
  assert.match(source, /dark:to-slate-800\/50/);
  assert.match(source, /dark:text-slate-400/);
});

test('PresetButtons includes dark button styling', () => {
  const source = readSource('src/components/PresetButtons.jsx');

  assert.match(source, /dark:bg-slate-900\/80/);
  assert.match(source, /dark:border-slate-700/);
  assert.match(source, /dark:hover:bg-slate-700/);
});

test('MarriagePlanSection includes dark gradient and panel styling', () => {
  const source = readSource('src/components/MarriagePlanSection.jsx');

  assert.match(source, /dark:from-slate-900\/70/);
  assert.match(source, /dark:border-slate-700/);
  assert.match(source, /dark:bg-slate-900\/60/);
});

test('RetirementPlanSection includes dark gradient and summary styling', () => {
  const source = readSource('src/components/RetirementPlanSection.jsx');

  assert.match(source, /dark:from-slate-900\/70/);
  assert.match(source, /dark:border-slate-700/);
  assert.match(source, /dark:bg-slate-900\/60/);
});

test('PortfolioSection includes dark card and toggle styling', () => {
  const source = readSource('src/components/PortfolioSection.jsx');

  assert.match(source, /dark:bg-slate-900\/80/);
  assert.match(source, /dark:bg-slate-800\/60/);
  assert.match(source, /dark:text-slate-200/);
});

test('InsightsSection includes dark gradient background', () => {
  const source = readSource('src/components/InsightsSection.jsx');

  assert.match(source, /dark:from-slate-900\/70/);
  assert.match(source, /dark:to-slate-800\/60/);
  assert.match(source, /dark:text-slate-200/);
});
