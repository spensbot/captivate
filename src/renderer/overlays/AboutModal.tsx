import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import AppModal from './AppModal'
import { AppAboutInfo } from '../../shared/about'
import { getAppAboutInfo } from '../ipcHandler'
import { useTypedSelector } from '../redux/store'
import type { StatusMessage } from '../redux/guiSlice'

interface Props {
  open: boolean
  onClose: () => void
}

export default function AboutModal({ open, onClose }: Props) {
  const [info, setInfo] = useState<AppAboutInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const statusMessages = useTypedSelector((state) => state.gui.statusMessages)

  const recentIssues = useMemo(
    () =>
      statusMessages
        .filter((message) => message.level === 'warn' || message.level === 'error')
        .slice(-30),
    [statusMessages]
  )

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setCopyStatus(null)
    getAppAboutInfo()
      .then((value) => {
        if (!cancelled) {
          setInfo(value)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const copySystemInfo = async () => {
    if (info === null) {
      setCopyStatus('Nothing to copy yet.')
      return
    }

    const text = buildSystemInfoText(info, recentIssues)
    try {
      await copyText(text)
      setCopyStatus('System info copied to clipboard.')
    } catch (err) {
      setCopyStatus(
        `Copy failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  const body = useMemo(() => {
    if (loading && info === null) {
      return <Muted>Loading software information...</Muted>
    }
    if (error !== null && info === null) {
      return <ErrorText>{error}</ErrorText>
    }
    if (info === null) {
      return <Muted>No software information available.</Muted>
    }

    return (
      <Body>
        {copyStatus !== null && (
          <StatusNotice>{copyStatus}</StatusNotice>
        )}
        <Section>
          <SectionTitle>Software</SectionTitle>
          <Row>
            <Label>App</Label>
            <Value>
              {info.appName} v{info.appVersion}
            </Value>
          </Row>
          <Row>
            <Label>Description</Label>
            <Value>{info.description}</Value>
          </Row>
          <Row>
            <Label>Electron</Label>
            <Value>{info.runtime.electron}</Value>
          </Row>
          <Row>
            <Label>Chrome</Label>
            <Value>{info.runtime.chrome}</Value>
          </Row>
          <Row>
            <Label>Node.js</Label>
            <Value>{info.runtime.node}</Value>
          </Row>
          <Row>
            <Label>V8</Label>
            <Value>{info.runtime.v8}</Value>
          </Row>
        </Section>

        <Section>
          <SectionTitle>GitHub & Links</SectionTitle>
          {info.links.map((link) => (
            <Row key={link.url}>
              <Label>{link.label}</Label>
              <Value>
                <A href={link.url} target="_blank" rel="noreferrer">
                  {link.url}
                </A>
              </Value>
            </Row>
          ))}
        </Section>

        <Section>
          <SectionTitle>Credits</SectionTitle>
          <Row>
            <Label>Original Creator</Label>
            <Value>{info.credits.originalCreator}</Value>
          </Row>
          <Row>
            <Label>Contributors</Label>
            <Value>{info.credits.contributors.join(', ')}</Value>
          </Row>
        </Section>

        <Section>
          <SectionTitle>Open Source Acknowledgments</SectionTitle>
          {info.dependencies.length <= 0 ? (
            <Muted>No dependency metadata found in package.json.</Muted>
          ) : (
            info.dependencies.map((dependency) => (
              <Row key={dependency.name}>
                <Label>{dependency.name}</Label>
                <Value>
                  {dependency.version} ({dependency.license}){' '}
                  <A href={dependency.url} target="_blank" rel="noreferrer">
                    Source
                  </A>
                </Value>
              </Row>
            ))
          )}
        </Section>
      </Body>
    )
  }, [copyStatus, error, info, loading])

  return (
    <AppModal
      open={open}
      title="About Captivate 2"
      onClose={onClose}
      actions={[
        {
          label: 'Copy System Info',
          onClick: () => {
            void copySystemInfo()
          },
        },
        {
          label: 'Close',
          onClick: onClose,
        },
      ]}
    >
      {body}
    </AppModal>
  )
}

function buildSystemInfoText(info: AppAboutInfo, recentIssues: StatusMessage[]) {
  const softwareLines = [
    `${info.appName} v${info.appVersion}`,
    `Electron: ${info.runtime.electron}`,
    `Chrome: ${info.runtime.chrome}`,
    `Node.js: ${info.runtime.node}`,
    `V8: ${info.runtime.v8}`,
  ]
  const issueLines =
    recentIssues.length <= 0
      ? ['None']
      : recentIssues.map((issue) => {
          const stamp = new Date(issue.ts).toISOString()
          const src = issue.source ? ` [${issue.source}]` : ''
          return `${stamp} [${issue.level.toUpperCase()}]${src} ${issue.message}`
        })

  return [
    ...softwareLines,
    '',
    'Recent warnings/errors (tail):',
    ...issueLines,
  ].join('\n')
}

async function copyText(text: string) {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard !== undefined &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    await navigator.clipboard.writeText(text)
    return
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard API is unavailable')
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const success = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!success) {
    throw new Error('Clipboard copy command failed')
  }
}

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`

const Section = styled.div`
  border: 1px solid #ffffff1f;
  border-radius: 0.35rem;
  padding: 0.5rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const SectionTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.primary};
  margin-bottom: 0.2rem;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(7.8rem, 9rem) 1fr;
  gap: 0.45rem;
  align-items: baseline;
  font-size: 0.79rem;
`

const Label = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
`

const Value = styled.div`
  color: ${(props) => props.theme.colors.text.primary};
  min-width: 0;
  word-break: break-word;
`

const A = styled.a`
  color: #8bb7ff;
  text-decoration: none;
  :hover {
    text-decoration: underline;
  }
`

const Muted = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.8rem;
`

const ErrorText = styled.div`
  color: #ffaeae;
  font-size: 0.8rem;
`

const StatusNotice = styled.div`
  color: #a8d7ff;
  font-size: 0.8rem;
`
