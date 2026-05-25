export type FixtureLibrarySubmitInput = {
  manufacturer: string
  model: string
  serializedLibrary: string
}

export type FixtureLibrarySubmitProgressPhase =
  | 'sign_in'
  | 'signed_in'
  | 'creating_pull_request'
  | 'creating_issue'

export type FixtureLibrarySubmitProgress = {
  phase: FixtureLibrarySubmitProgressPhase
  message: string
}

export type FixtureLibrarySubmitResult =
  | { ok: true; mode: 'pull_request'; prUrl: string; prNumber?: number }
  | {
      ok: true
      mode: 'issue'
      issueUrl: string
      issueNumber?: number
      message?: string
    }
  | { ok: true; mode: 'browser'; message: string }
  | { ok: false; message: string }
