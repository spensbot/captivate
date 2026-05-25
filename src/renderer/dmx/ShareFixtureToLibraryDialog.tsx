import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Typography,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import styled from 'styled-components'
import { FixtureType } from '../../shared/dmxFixtures'
import { serializeSingleFixtureForLibrary } from '../../shared/fixtureLibrary'
import { suggestedLibraryRelativePath } from '../../shared/captivateFixtureLibraryRemote'
import { captivateFileFilters, saveFile } from '../autosave'
import { openAppAlert } from 'renderer/overlays/appDialogService'
import {
  submitFixtureToCommunityLibrary,
  subscribeFixtureLibrarySubmitProgress,
} from '../fixtureLibraryCommunity'
import type {
  FixtureLibrarySubmitProgress,
  FixtureLibrarySubmitProgressPhase,
  FixtureLibrarySubmitResult,
} from '../../shared/fixtureLibrarySubmitTypes'
import FixtureLibraryInfoButton from './FixtureLibraryInfoButton'

type Props = {
  open: boolean
  fixture: FixtureType
  onClose: () => void
}

type WorkflowStepKey =
  | 'sign_in'
  | 'send_fixture'
  | 'review'
  | 'publish'
  | 'available'

type WorkflowStep = {
  key: WorkflowStepKey
  title: string
  detail: string
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    key: 'sign_in',
    title: 'Sign in on the web',
    detail:
      'Your browser opens to GitHub. Captivate puts a sign-in code on your clipboard—paste it on that page when asked.',
  },
  {
    key: 'send_fixture',
    title: 'Send your fixture',
    detail:
      'Captivate sends your fixture to the community library for you.',
  },
  {
    key: 'review',
    title: 'Library check',
    detail:
      'The library makes sure your fixture looks complete and ready to share.',
  },
  {
    key: 'publish',
    title: 'Add to the library',
    detail:
      'Your fixture is added automatically. You do not need to approve anything yourself.',
  },
  {
    key: 'available',
    title: 'Ready for everyone',
    detail:
      'Find it in Search For Fixture Online → Captivate Community Library. Tap Refresh if it is not there yet.',
  },
]

type StepVisualState = 'pending' | 'active' | 'done' | 'waiting'

function friendlyProgressMessage(
  progress: FixtureLibrarySubmitProgress,
  manufacturer: string,
  modelName: string
): string {
  switch (progress.phase) {
    case 'sign_in':
      return 'Opening GitHub sign-in… A sign-in code is on your clipboard—paste it on the GitHub page when asked.'
    case 'signed_in':
      return 'Signed in. Sending your fixture…'
    case 'creating_pull_request':
      return `Sending ${manufacturer} — ${modelName} to the community library…`
    case 'creating_issue':
      return 'Sending your fixture another way—almost done…'
    default:
      return progress.message
  }
}

function friendlySubmitSuccessMessage(
  submitResult: FixtureLibrarySubmitResult,
  manufacturer: string,
  modelName: string
): string {
  if (!submitResult.ok) {
    return submitResult.message
  }

  if (submitResult.mode === 'pull_request') {
    return `Thanks! ${manufacturer} — ${modelName} was submitted. The library will check it and add it for everyone shortly.`
  }

  if (submitResult.mode === 'issue') {
    return `Thanks! ${manufacturer} — ${modelName} was sent. The library will finish adding it on the web.`
  }

  return submitResult.message
}

function stepStateFor(
  stepKey: WorkflowStepKey,
  submitting: boolean,
  progressPhase: FixtureLibrarySubmitProgressPhase | null,
  result: FixtureLibrarySubmitResult | null
): StepVisualState {
  if (result?.ok && result.mode === 'pull_request') {
    if (stepKey === 'sign_in' || stepKey === 'send_fixture') return 'done'
    if (stepKey === 'review' || stepKey === 'publish') return 'waiting'
    if (stepKey === 'available') return 'pending'
  }

  if (result?.ok && result.mode === 'issue') {
    if (stepKey === 'sign_in') return 'done'
    if (stepKey === 'send_fixture') return 'waiting'
    if (stepKey === 'review' || stepKey === 'publish' || stepKey === 'available')
      return 'pending'
  }

  if (!submitting) return 'pending'

  if (progressPhase === 'sign_in') {
    if (stepKey === 'sign_in') return 'active'
    return 'pending'
  }

  if (
    progressPhase === 'signed_in' ||
    progressPhase === 'creating_pull_request' ||
    progressPhase === 'creating_issue'
  ) {
    if (stepKey === 'sign_in') return 'done'
    if (stepKey === 'send_fixture') return 'active'
    return 'pending'
  }

  return 'pending'
}

export default function ShareFixtureToLibraryDialog({
  open,
  fixture,
  onClose,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [progressPhase, setProgressPhase] =
    useState<FixtureLibrarySubmitProgressPhase | null>(null)
  const [result, setResult] = useState<FixtureLibrarySubmitResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const manufacturer = fixture.manufacturer?.trim() ?? ''
  const modelName = fixture.name?.trim() ?? ''
  const canSubmit = manufacturer.length > 0 && modelName.length > 0
  const relativePath = canSubmit
    ? suggestedLibraryRelativePath(fixture)
    : undefined

  useEffect(() => {
    if (!open) {
      setBusy(false)
      setStatusMessage(null)
      setProgressPhase(null)
      setResult(null)
      setErrorMessage(null)
    }
  }, [open])

  async function submitOnline() {
    if (!canSubmit) {
      await openAppAlert({
        title: 'Share to Library',
        message:
          'Enter both Manufacturer and Fixture Name on this fixture before sharing.',
        level: 'warn',
        source: 'Fixtures',
      })
      return
    }

    setBusy(true)
    setResult(null)
    setErrorMessage(null)
    setProgressPhase(null)
    setStatusMessage('Getting ready…')

    const unsubscribe = subscribeFixtureLibrarySubmitProgress((progress) => {
      setProgressPhase(progress.phase)
      setStatusMessage(friendlyProgressMessage(progress, manufacturer, modelName))
    })

    try {
      const serialized = serializeSingleFixtureForLibrary({
        ...fixture,
        manufacturer,
        name: modelName,
      })

      const submitResult = await submitFixtureToCommunityLibrary({
        manufacturer,
        model: modelName,
        serializedLibrary: serialized,
      })

      if (!submitResult.ok) {
        setErrorMessage(submitResult.message)
        setStatusMessage(null)
        return
      }

      setResult(submitResult)
      setStatusMessage(
        friendlySubmitSuccessMessage(submitResult, manufacturer, modelName)
      )
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      )
      setStatusMessage(null)
    } finally {
      unsubscribe()
      setBusy(false)
    }
  }

  async function exportForContribution() {
    if (!canSubmit) {
      await openAppAlert({
        title: 'Share to Library',
        message:
          'Enter both Manufacturer and Fixture Name on this fixture before saving a copy.',
        level: 'warn',
        source: 'Fixtures',
      })
      return
    }

    const serialized = serializeSingleFixtureForLibrary({
      ...fixture,
      manufacturer,
      name: modelName,
    })

    try {
      const saved = await saveFile(
        `Community library copy: ${modelName}`,
        serialized,
        [captivateFileFilters.captivateFixtures]
      )
      if (saved === null) {
        return
      }

      await openAppAlert({
        title: 'Saved',
        message: 'A copy of your fixture was saved to your computer.',
        level: 'info',
        source: 'Fixtures',
      })
    } catch (err) {
      await openAppAlert({
        title: 'Share to Library',
        message:
          err instanceof Error ? err.message : 'Could not save the file.',
        level: 'error',
        source: 'Fixtures',
      })
    }
  }

  const showResult = result?.ok === true
  const viewOnGitHubUrl =
    result?.ok && (result.mode === 'pull_request' || result.mode === 'issue')
      ? result.mode === 'pull_request'
        ? result.prUrl
        : result.issueUrl
      : undefined

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 1 }}>
        <TitleRow>
          <span>Share to Community Library</span>
          <FixtureLibraryInfoButton
            topic="share-to-library"
            relativePath={relativePath}
          />
        </TitleRow>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Share <strong>{modelName || 'this fixture'}</strong>
          {manufacturer ? (
            <>
              {' '}
              from <strong>{manufacturer}</strong>
            </>
          ) : null}{' '}
          so others can use it in Captivate. You only sign in once in your
          browser—the library handles the rest.
        </Typography>

        {!canSubmit && (
          <Alert severity="warning" variant="outlined">
            Enter <strong>Manufacturer</strong> and <strong>Fixture Name</strong>{' '}
            on this fixture before you can share it.
          </Alert>
        )}

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
            What happens when you share
          </Typography>
          <StepList>
            {WORKFLOW_STEPS.map((step) => {
              const state = stepStateFor(
                step.key,
                busy,
                progressPhase,
                result
              )
              return (
                <StepRow key={step.key} $state={state}>
                  <StepIconWrap>
                    {state === 'active' ? (
                      <CircularProgress size={18} />
                    ) : state === 'done' ? (
                      <CheckCircleOutlineIcon
                        fontSize="small"
                        color="success"
                      />
                    ) : (
                      <RadioButtonUncheckedIcon
                        fontSize="small"
                        sx={{ opacity: 0.45 }}
                      />
                    )}
                  </StepIconWrap>
                  <StepText>
                    <Typography variant="body2" fontWeight={600}>
                      {step.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {step.detail}
                    </Typography>
                  </StepText>
                </StepRow>
              )
            })}
          </StepList>
        </Box>

        {statusMessage !== null && (
          <Alert severity={busy ? 'info' : showResult ? 'success' : 'info'}>
            {statusMessage}
            {viewOnGitHubUrl !== undefined && (
              <>
                {' '}
                <Link
                  href={viewOnGitHubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </Link>
              </>
            )}
          </Alert>
        )}

        {errorMessage !== null && <Alert severity="error">{errorMessage}</Alert>}

        {showResult &&
          (result.mode === 'pull_request' || result.mode === 'issue') && (
            <Typography variant="caption" color="text.secondary">
              The last few steps finish on their own. When your fixture is in
              the library, open <strong>Search For Fixture Online</strong>,
              choose <strong>Captivate Community Library</strong>, and tap{' '}
              <strong>Refresh</strong>.
            </Typography>
          )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {showResult ? 'Done' : 'Close'}
        </Button>
        <Button
          variant="outlined"
          disabled={!canSubmit || busy}
          onClick={() => void exportForContribution()}
        >
          Save a copy…
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit || busy || showResult}
          onClick={() => void submitOnline()}
        >
          {busy ? 'Sharing…' : showResult ? 'Shared' : 'Share to Library'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  width: 100%;
`

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`

const StepRow = styled.div<{ $state: StepVisualState }>`
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  opacity: ${(p) =>
    p.$state === 'pending' ? 0.72 : p.$state === 'waiting' ? 0.88 : 1};
`

const StepIconWrap = styled.div`
  flex-shrink: 0;
  width: 22px;
  padding-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const StepText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
`
