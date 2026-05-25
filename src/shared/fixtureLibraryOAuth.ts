import { CAPTIVATE_GITHUB_REPO_URL } from './githubRepo'

/**
 * GitHub OAuth App Client ID (public) for Device Flow fixture submissions.
 *
 * Optional override at runtime (main process): environment variable
 * `CAPTIVATE_FIXTURE_LIBRARY_OAUTH_CLIENT_ID`
 */
export const FIXTURE_LIBRARY_OAUTH_CLIENT_ID = 'Ov23lib0YSi1RqmllpJR'

export function getFixtureLibraryOAuthClientId(): string {
  const fromEnv =
    typeof process !== 'undefined' &&
    typeof process.env?.CAPTIVATE_FIXTURE_LIBRARY_OAUTH_CLIENT_ID === 'string'
      ? process.env.CAPTIVATE_FIXTURE_LIBRARY_OAUTH_CLIENT_ID.trim()
      : ''

  return fromEnv.length > 0 ? fromEnv : FIXTURE_LIBRARY_OAUTH_CLIENT_ID.trim()
}

export function isFixtureLibraryOAuthConfigured(): boolean {
  return getFixtureLibraryOAuthClientId().length > 0
}

/** Suggested values when registering the OAuth app on GitHub. */
export const FIXTURE_LIBRARY_OAUTH_APP_DEFAULTS = {
  applicationName: 'Captivate 2 Fixture Library',
  homepageUrl: CAPTIVATE_GITHUB_REPO_URL,
  /** Required by GitHub; not used for Device Flow. */
  callbackUrl: 'http://localhost',
  enableDeviceFlow: true,
} as const

export const FIXTURE_LIBRARY_OAUTH_NEW_APP_URL =
  'https://github.com/settings/applications/new'

export const FIXTURE_LIBRARY_OAUTH_APPS_LIST_URL =
  'https://github.com/settings/developers'
