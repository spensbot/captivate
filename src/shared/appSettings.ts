/**
 * Application preferences (persisted). Theme and language pack IDs are placeholders
 * for future installable packs; built-in options ship with the app today.
 */

export type ThemePackId = 'dark' | 'light'

export type LanguagePackId = 'en'

export interface AppSettings {
  themePackId: ThemePackId
  languagePackId: LanguagePackId
  /** When true, project + fixture DB are written to the workspace files on an interval. */
  autosaveEnabled: boolean
  /** Last active project file (`.cap` / legacy `.captivate`). */
  lastProjectFilePath: string | null
  /** Sibling fixture DB for the last active project (`.cfx`). */
  lastFixtureLibraryFilePath: string | null
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themePackId: 'dark',
  languagePackId: 'en',
  autosaveEnabled: true,
  lastProjectFilePath: null,
  lastFixtureLibraryFilePath: null,
}

export type ThemePackOption = {
  id: ThemePackId
  label: string
  description: string
}

export type LanguagePackOption = {
  id: LanguagePackId
  label: string
  description: string
  /** When false, UI shows as coming soon / not yet loadable. */
  available: boolean
}

export const BUILTIN_THEME_PACKS: ThemePackOption[] = [
  {
    id: 'dark',
    label: 'Dark',
    description: 'Default Captivate dark interface.',
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Light backgrounds with high-contrast text and icons.',
  },
]

export const BUILTIN_LANGUAGE_PACKS: LanguagePackOption[] = [
  {
    id: 'en',
    label: 'English',
    description: 'Built-in UI strings.',
    available: true,
  },
]

export function normalizeAppSettings(raw: unknown): AppSettings {
  const base = { ...DEFAULT_APP_SETTINGS }
  if (raw === null || typeof raw !== 'object') {
    return base
  }
  const source = raw as Partial<AppSettings>
  if (source.themePackId === 'dark' || source.themePackId === 'light') {
    base.themePackId = source.themePackId
  }
  if (source.languagePackId === 'en') {
    base.languagePackId = source.languagePackId
  }
  if (typeof source.autosaveEnabled === 'boolean') {
    base.autosaveEnabled = source.autosaveEnabled
  }
  if (
    typeof source.lastProjectFilePath === 'string' &&
    source.lastProjectFilePath.length > 0
  ) {
    base.lastProjectFilePath = source.lastProjectFilePath
  } else if (source.lastProjectFilePath === null) {
    base.lastProjectFilePath = null
  }
  if (
    typeof source.lastFixtureLibraryFilePath === 'string' &&
    source.lastFixtureLibraryFilePath.length > 0
  ) {
    base.lastFixtureLibraryFilePath = source.lastFixtureLibraryFilePath
  } else if (source.lastFixtureLibraryFilePath === null) {
    base.lastFixtureLibraryFilePath = null
  }
  return base
}
