import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getInitialTheme, getNextTheme, resolveTheme, THEME_STORAGE_KEY } from '../src/utils/theme.js';

const createStorage = (value) => ({
  getItem: (key) => (key === THEME_STORAGE_KEY ? value : null),
});

const createMatchMedia = (matches) => (query) => ({
  matches,
  media: query,
});

test('getInitialTheme returns stored theme when valid', () => {
  const storage = createStorage('dark');

  assert.equal(getInitialTheme({ storage, matchMedia: createMatchMedia(false) }), 'dark');
});

test('getInitialTheme falls back to system preference', () => {
  const storage = createStorage(null);

  assert.equal(getInitialTheme({ storage, matchMedia: createMatchMedia(true) }), 'dark');
  assert.equal(getInitialTheme({ storage, matchMedia: createMatchMedia(false) }), 'light');
});

test('getInitialTheme defaults to light without matchMedia', () => {
  const storage = createStorage('unexpected');

  assert.equal(getInitialTheme({ storage }), 'light');
});

test('getNextTheme cycles through light, dark, system', () => {
  assert.equal(getNextTheme('light'), 'dark');
  assert.equal(getNextTheme('dark'), 'system');
  assert.equal(getNextTheme('system'), 'light');
});

test('resolveTheme uses system preference when needed', () => {
  assert.equal(resolveTheme('system', createMatchMedia(true)), 'dark');
  assert.equal(resolveTheme('system', createMatchMedia(false)), 'light');
  assert.equal(resolveTheme('dark', createMatchMedia(false)), 'dark');
});
