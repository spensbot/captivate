import { CAPTIVATE_GITHUB_OWNER } from './githubRepo'

/** Community fixture library hosted on GitHub (folder-per-manufacturer). */
export const CAPTIVATE_FIXTURE_LIBRARY_REPO_NAME = 'captivate-fixture-library'
export const CAPTIVATE_FIXTURE_LIBRARY_DEFAULT_BRANCH = 'main'
export const CAPTIVATE_FIXTURE_LIBRARY_REPO_SLUG = `${CAPTIVATE_GITHUB_OWNER}/${CAPTIVATE_FIXTURE_LIBRARY_REPO_NAME}`

export function captivateFixtureLibraryRepoUrl(): string {
  return `https://github.com/${CAPTIVATE_FIXTURE_LIBRARY_REPO_SLUG}`
}

export function captivateFixtureLibraryContentsApiUrl(
  relativePath = 'fixtures'
): string {
  const encoded = relativePath
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `https://api.github.com/repos/${CAPTIVATE_FIXTURE_LIBRARY_REPO_SLUG}/contents/${encoded}`
}

export function captivateFixtureLibraryContributeUrl(): string {
  return `${captivateFixtureLibraryRepoUrl()}/blob/${CAPTIVATE_FIXTURE_LIBRARY_DEFAULT_BRANCH}/CONTRIBUTING.md`
}

/** GitHub issue form — no pull request required from the contributor. */
export function captivateFixtureLibraryIssueFormUrl(
  manufacturer: string,
  model: string,
  _manufacturerSlug?: string,
  _modelSlug?: string
): string {
  const params = new URLSearchParams({
    template: 'fixture-submission.yml',
    title: `Fixture: ${manufacturer} — ${model}`,
  })
  return `${captivateFixtureLibraryRepoUrl()}/issues/new?${params.toString()}`
}

/** Opens GitHub “new file” UI for a suggested library path (user pastes exported JSON). */
export function captivateFixtureLibraryNewFixtureUrl(
  manufacturerSlug: string,
  fixtureSlug: string
): string {
  const path = `fixtures/${manufacturerSlug}/${fixtureSlug}.json`
  return `${captivateFixtureLibraryRepoUrl()}/new/${CAPTIVATE_FIXTURE_LIBRARY_DEFAULT_BRANCH}/${path}`
}

export function slugifyLibraryPathSegment(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.length === 0) {
    return 'custom'
  }

  const ascii = trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')

  const slug = ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : 'custom'
}

export function suggestedLibraryRelativePath(fixture: {
  manufacturer?: string
  name: string
}): string {
  const manufacturerSlug = slugifyLibraryPathSegment(
    fixture.manufacturer ?? 'custom'
  )
  const fixtureSlug = slugifyLibraryPathSegment(fixture.name)
  return `fixtures/${manufacturerSlug}/${fixtureSlug}.json`
}

export function fixtureFileDisplayName(fileName: string): string {
  const base = fileName.replace(/\.json$/i, '')
  return base.replace(/-/g, ' ')
}
