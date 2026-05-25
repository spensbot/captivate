import {
  CAPTIVATE_FIXTURE_LIBRARY_DEFAULT_BRANCH,
  CAPTIVATE_FIXTURE_LIBRARY_REPO_SLUG,
  suggestedLibraryRelativePath,
} from '../shared/captivateFixtureLibraryRemote'
import type { FixtureLibrarySubmitInput } from '../shared/fixtureLibrarySubmitTypes'

const API = 'https://api.github.com'

type GitHubError = { message?: string }

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

  await githubFetch(
    `/repos/${owner}/${repo}/contents/${filePath}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: `Add fixture: ${input.manufacturer} — ${input.model}`,
        content: contentBase64,
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
