export const THEME_STORAGE_KEY = 'vooAppTheme';

const VALID_THEMES = new Set(['light', 'dark', 'system']);

const normalizeTheme = (value) => (VALID_THEMES.has(value) ? value : null);

const getStoredTheme = (storage) => {
  if (!storage?.getItem) return null;
  try {
    return normalizeTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
};

const getPrefersDark = (matchMedia) => {
  if (!matchMedia) return null;
  const query = '(prefers-color-scheme: dark)';
  const media = matchMedia(query);
  if (!media) return null;
  return Boolean(media.matches);
};

export const getInitialTheme = ({ storage, matchMedia } = {}) => {
  const storedTheme = getStoredTheme(storage);
  if (storedTheme) return storedTheme;
  const prefersDark = getPrefersDark(matchMedia);
  if (prefersDark === true) return 'dark';
  if (prefersDark === false) return 'light';
  return 'light';
};

export const getNextTheme = (currentTheme) => {
  if (currentTheme === 'light') return 'dark';
  if (currentTheme === 'dark') return 'system';
  return 'light';
};

export const resolveTheme = (theme, matchMedia) => {
  if (theme === 'system') {
    return getPrefersDark(matchMedia) ? 'dark' : 'light';
  }
  return theme === 'dark' ? 'dark' : 'light';
};
