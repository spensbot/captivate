import {
  CAPTIVATE_FIXTURE_LIBRARY_DEFAULT_BRANCH,
  CAPTIVATE_FIXTURE_LIBRARY_REPO_SLUG,
  suggestedLibraryRelativePath,
} from '../shared/captivateFixtureLibraryRemote'
import type { FixtureLibrarySubmitInput } from '../shared/fixtureLibrarySubmitTypes'

const API = 'https://api.github.com'

type GitHubError = { message?: string }

type GitHubContentFile = {
  type: 'file'
  sha: string
  content: string
}

async function githubFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    let detail = text
    try {
      const parsed = JSON.parse(text) as GitHubError
      if (parsed.message) detail = parsed.message
    } catch {
      // keep raw text
    }
    throw new Error(`GitHub API ${response.status}: ${detail}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function libraryJsonForSubmit(serialized: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    throw new Error('Fixture JSON is invalid.')
  }

  const record = parsed as { fixtures?: unknown[]; schema?: string; version?: number }
  if (Array.isArray(record.fixtures) && record.fixtures.length > 0) {
    return JSON.stringify(
      {
        schema: record.schema ?? 'captivate.fixture-library',
        version: record.version ?? 2,
        fixtures: record.fixtures,
      },
      null,
      2
    )
  }

  if (Array.isArray(parsed) && parsed.length > 0) {
    return JSON.stringify(
      {
        schema: 'captivate.fixture-library',
        version: 2,
        fixtures: parsed,
      },
      null,
      2
    )
  }

  throw new Error('Fixture JSON must include a fixtures array.')
}

function libraryQualityScore(jsonText: string): number {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return 0
  }
  const root = parsed as {
    fixtures?: Array<{
      channels?: unknown[]
      subFixtures?: unknown[]
      model?: {
        useCustomEmitterLayout?: unknown
        customEmitters?: unknown[]
        kind?: unknown
      }
      modes?: unknown[]
      capabilities?: unknown[]
    }>
  }
  const fixtures = Array.isArray(root.fixtures) ? root.fixtures : []
  if (fixtures.length === 0) {
    return 0
  }

  let score = 0
  for (const fixture of fixtures) {
    const channels = Array.isArray(fixture.channels) ? fixture.channels.length : 0
    const subFixtures = Array.isArray(fixture.subFixtures)
      ? fixture.subFixtures.length
      : 0
    const modes = Array.isArray(fixture.modes) ? fixture.modes.length : 0
    const capabilities = Array.isArray(fixture.capabilities)
      ? fixture.capabilities.length
      : 0
    const customEmitters = Array.isArray(fixture.model?.customEmitters)
      ? fixture.model?.customEmitters.length
      : 0
    const customLayout = fixture.model?.useCustomEmitterLayout === true ? 1 : 0
    const explicitModelKind =
      typeof fixture.model?.kind === 'string' && fixture.model.kind !== 'auto'
        ? 1
        : 0

    score += channels * 8
    score += subFixtures * 14
    score += modes * 4
    score += capabilities * 3
    score += customEmitters * 2
    score += customLayout * 18
    score += explicitModelKind * 8
  }
  return score
}

function archivePathForDuplicate(filePath: string): string {
  const match = filePath.match(/^fixtures\/([^/]+)\/(.+)\.json$/)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  if (match === null) {
    return `fixtures/_archive/replaced-${stamp}.json`
  }
  const manufacturer = match[1]
  const model = match[2]
  return `fixtures/_archive/${manufacturer}/${model}/${stamp}.json`
}

async function getContentIfExists(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<GitHubContentFile | null> {
  try {
    const content = await githubFetch<GitHubContentFile | GitHubError>(
      `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
      token
    )
    if ((content as GitHubContentFile).type === 'file') {
      return content as GitHubContentFile
    }
    return null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('GitHub API 404')) {
      return null
    }
    throw err
  }
}

export async function createPullRequestForFixture(
  token: string,
  input: FixtureLibrarySubmitInput
): Promise<{ prUrl: string; prNumber: number }> {
  const [owner, repo] = CAPTIVATE_FIXTURE_LIBRARY_REPO_SLUG.split('/')
  const base = CAPTIVATE_FIXTURE_LIBRARY_DEFAULT_BRANCH
  const filePath = suggestedLibraryRelativePath({
    manufacturer: input.manufacturer,
    name: input.model,
  })
  const branch = `fixture/captivate-${Date.now()}`
  const content = libraryJsonForSubmit(input.serializedLibrary)
  const contentBase64 = Buffer.from(content, 'utf8').toString('base64')

  const ref = await githubFetch<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${base}`,
    token
  )
  const baseSha = ref.object.sha

  await githubFetch(
    `/repos/${owner}/${repo}/git/refs`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: baseSha,
      }),
    }
  )

  const existing = await getContentIfExists(token, owner, repo, filePath, base)
  if (existing !== null) {
    const existingText = Buffer.from(existing.content, 'base64').toString('utf8')
    const incomingScore = libraryQualityScore(content)
    const existingScore = libraryQualityScore(existingText)
    if (incomingScore <= existingScore) {
      throw new Error(
        'A fixture with this manufacturer/model already exists in the community library and this submission does not appear to improve it.'
      )
    }

    const archivePath = archivePathForDuplicate(filePath)
    const archiveContentBase64 = Buffer.from(existingText, 'utf8').toString('base64')
    await githubFetch(
      `/repos/${owner}/${repo}/contents/${archivePath}`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({
          message: `Archive replaced fixture: ${input.manufacturer} — ${input.model}`,
          content: archiveContentBase64,
          branch,
        }),
      }
    )
  }

  await githubFetch(
    `/repos/${owner}/${repo}/contents/${filePath}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message:
          existing === null
            ? `Add fixture: ${input.manufacturer} — ${input.model}`
            : `Replace fixture with improved version: ${input.manufacturer} — ${input.model}`,
        content: contentBase64,
        sha: existing?.sha,
        branch,
      }),
    }
  )

  const pr = await githubFetch<{ html_url: string; number: number }>(
    `/repos/${owner}/${repo}/pulls`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        title: `Fixture: ${input.manufacturer} — ${input.model}`,
        head: branch,
        base,
        body: [
          'Submitted from **Captivate 2**.',
          '',
          'GitHub Actions will validate this file and merge the pull request automatically (no manual approval).',
          '',
          `**File:** \`${filePath}\``,
          ...(existing === null
            ? []
            : ['**Duplicate handling:** existing file was archived and replaced by this improved submission.']),
        ].join('\n'),
      }),
    }
  )

  return { prUrl: pr.html_url, prNumber: pr.number }
}

export function buildIssueBody(input: FixtureLibrarySubmitInput): string {
  return [
    '_Submitted from Captivate 2. The library bot will open a pull request and merge after validation._',
    '',
    '### Manufacturer',
    '',
    input.manufacturer,
    '',
    '### Model name',
    '',
    input.model,
    '',
    '### Fixture JSON',
    '',
    '```json',
    libraryJsonForSubmit(input.serializedLibrary),
    '```',
  ].join('\n')
}

export async function createIssueForFixture(
  token: string,
  input: FixtureLibrarySubmitInput
): Promise<{ issueUrl: string; issueNumber: number }> {
  const [owner, repo] = CAPTIVATE_FIXTURE_LIBRARY_REPO_SLUG.split('/')
  const issue = await githubFetch<{ html_url: string; number: number }>(
    `/repos/${owner}/${repo}/issues`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        title: `Fixture: ${input.manufacturer} — ${input.model}`,
        body: buildIssueBody(input),
        labels: ['fixture-submission'],
      }),
    }
  )

  return { issueUrl: issue.html_url, issueNumber: issue.number }
}
