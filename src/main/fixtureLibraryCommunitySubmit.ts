import { clipboard, shell, type WebContents } from 'electron'
import {
  captivateFixtureLibraryIssueFormUrl,
  slugifyLibraryPathSegment,
} from '../shared/captivateFixtureLibraryRemote'
import { getFixtureLibraryOAuthClientId } from '../shared/fixtureLibraryOAuth'
import ipcChannels from '../shared/ipc_channels'
import type {
  FixtureLibrarySubmitInput,
  FixtureLibrarySubmitProgress,
  FixtureLibrarySubmitResult,
} from '../shared/fixtureLibrarySubmitTypes'
import {
  createIssueForFixture,
  createPullRequestForFixture,
} from './fixtureLibraryGithubApi'

const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'

/** Write access to public repos — required to open a PR from Captivate. */
const DEVICE_FLOW_SCOPE = 'public_repo'

type DeviceCodeResponse = {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

type AccessTokenResponse = {
  access_token?: string
  error?: string
  error_description?: string
}

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const clientId = getFixtureLibraryOAuthClientId()
  if (clientId.length === 0) {
    throw new Error('OAuth client id not configured')
  }

  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: DEVICE_FLOW_SCOPE,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub device authorization failed (${response.status}): ${text}`)
  }

  return (await response.json()) as DeviceCodeResponse
}

async function pollAccessToken(
  deviceCode: string,
  intervalSec: number,
  expiresInSec: number
): Promise<string> {
  const deadline = Date.now() + expiresInSec * 1000
  let intervalMs = Math.max(5, intervalSec) * 1000

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))

    const response = await fetch(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: getFixtureLibraryOAuthClientId(),
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })

    const payload = (await response.json()) as AccessTokenResponse
    if (payload.access_token !== undefined && payload.access_token.length > 0) {
      return payload.access_token
    }

    if (payload.error === 'authorization_pending') {
      continue
    }

    if (payload.error === 'slow_down') {
      intervalMs += 5000
      continue
    }

    throw new Error(
      payload.error_description ?? payload.error ?? 'GitHub authorization failed.'
    )
  }

  throw new Error(
    'Sign-in took too long. Finish signing in on the GitHub page in your browser, then tap Share to Library again.'
  )
}

function emitSubmitProgress(
  sender: WebContents | undefined,
  progress: FixtureLibrarySubmitProgress
) {
  sender?.send(ipcChannels.fixture_library_submit_progress, progress)
}

async function authorizeViaDeviceFlow(
  sender: WebContents | undefined
): Promise<string> {
  emitSubmitProgress(sender, {
    phase: 'sign_in',
    message:
      'Opening GitHub sign-in. Paste the sign-in code from your clipboard when the page asks for it.',
  })

  const device = await requestDeviceCode()
  const verifyUrl = new URL(device.verification_uri)
  verifyUrl.searchParams.set('user_code', device.user_code)
  await shell.openExternal(verifyUrl.toString())
  clipboard.writeText(device.user_code)

  const token = await pollAccessToken(
    device.device_code,
    device.interval,
    device.expires_in
  )

  emitSubmitProgress(sender, {
    phase: 'signed_in',
    message: 'Signed in. Sending your fixture…',
  })

  return token
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Sign in with GitHub, open a PR on the library repo (primary Captivate path). */
export async function submitFixtureToCommunityLibrary(
  input: FixtureLibrarySubmitInput,
  sender?: WebContents
): Promise<FixtureLibrarySubmitResult> {
  const manufacturer = input.manufacturer.trim()
  const model = input.model.trim()
  if (manufacturer.length === 0 || model.length === 0) {
    return {
      ok: false,
      message: 'Manufacturer and model name are required.',
    }
  }

  if (getFixtureLibraryOAuthClientId().length === 0) {
    return openBrowserFallback(input, manufacturer, model)
  }

  try {
    const accessToken = await authorizeViaDeviceFlow(sender)

    try {
      emitSubmitProgress(sender, {
        phase: 'creating_pull_request',
        message: `Sending ${manufacturer} — ${model} to the community library…`,
      })
      const { prUrl, prNumber } = await createPullRequestForFixture(
        accessToken,
        input
      )
      return {
        ok: true,
        mode: 'pull_request',
        prUrl,
        prNumber,
      }
    } catch (prErr) {
      console.warn('Direct PR submit failed, trying issue fallback', prErr)
      try {
        emitSubmitProgress(sender, {
          phase: 'creating_issue',
          message: 'Sending your fixture another way—almost done…',
        })
        const { issueUrl, issueNumber } = await createIssueForFixture(
          accessToken,
          input
        )
        return {
          ok: true,
          mode: 'issue',
          issueUrl,
          issueNumber,
          message:
            'Your fixture was sent. The library will finish adding it on the web.',
        }
      } catch (issueErr) {
        console.warn('Fixture library issue fallback failed', issueErr, prErr)
        return {
          ok: false,
          message:
            'We could not send your fixture to the library. Please try again. If it keeps failing, tap Save a copy and use the website link in the help (?) menu.',
        }
      }
    }
  } catch (authErr) {
    console.warn('GitHub device flow failed', authErr)
    return {
      ok: false,
      message: `${formatError(authErr)}\n\nYou can also tap Save a copy and submit through the website (see the ? help).`,
    }
  }
}

async function openBrowserFallback(
  input: FixtureLibrarySubmitInput,
  manufacturer: string,
  model: string
): Promise<FixtureLibrarySubmitResult> {
  clipboard.writeText(input.serializedLibrary)
  const issueUrl = captivateFixtureLibraryIssueFormUrl(
    manufacturer,
    model,
    slugifyLibraryPathSegment(manufacturer),
    slugifyLibraryPathSegment(model)
  )
  await shell.openExternal(issueUrl)

  return {
    ok: true,
    mode: 'browser',
    message:
      'Your fixture was copied to the clipboard and the library website opened. Paste your fixture where the form asks for it, then submit on that page.',
  }
}
