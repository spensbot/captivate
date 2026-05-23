import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import AppModal from './AppModal'
import { AppAboutInfo } from '../../shared/about'
import { getAppAboutInfo } from '../ipcHandler'
import { useTypedSelector } from '../redux/store'
import type { StatusMessage } from '../redux/guiSlice'
import captivateLogo from '../images/Thick.png'

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
        <Hero>
          <Logo src={captivateLogo} alt="Captivate logo" />
          <HeroText>
            <ProductName>Captivate 2</ProductName>
            <VersionLine>Version {info.appVersion}</VersionLine>
            <Tagline>{info.tagline}</Tagline>
            <Blurb>{info.description}</Blurb>
            <CopyrightLine>
              {info.copyright} · {info.license} License
            </CopyrightLine>
          </HeroText>
        </Hero>

        {copyStatus !== null && <StatusNotice>{copyStatus}</StatusNotice>}

        <Section>
          <SectionTitle>Software</SectionTitle>
          <Row>
            <Label>Application</Label>
            <Value>
              {info.appName} {info.appVersion}
            </Value>
          </Row>
          <Row>
            <Label>Author</Label>
            <Value>{info.author}</Value>
          </Row>
          <Row>
            <Label>Platform</Label>
            <Value>
              {info.platform.os} ({info.platform.arch})
            </Value>
          </Row>
          <Row>
            <Label>Electron</Label>
            <Value>{info.runtime.electron}</Value>
          </Row>
          <Row>
            <Label>Chromium</Label>
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
          <SectionTitle>Links</SectionTitle>
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
          {info.credits.acknowledgements.map((line) => (
            <AckRow key={line}>{line}</AckRow>
          ))}
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
      maxWidth="44rem"
      maxHeight="min(88vh, 52rem)"
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
    info.tagline,
    info.description,
    `${info.copyright} · ${info.license} License`,
    `Author: ${info.author}`,
    `Platform: ${info.platform.os} (${info.platform.arch})`,
    `Electron: ${info.runtime.electron}`,
    `Chromium: ${info.runtime.chrome}`,
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
  overflow-y: auto;
  min-height: 0;
  padding-right: 0.1rem;
`

const Hero = styled.div`
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #ffffff24;
  border-radius: 0.45rem;
  background: linear-gradient(
    135deg,
    rgba(76, 145, 255, 0.12) 0%,
    rgba(161, 110, 255, 0.08) 55%,
    rgba(255, 84, 155, 0.06) 100%
  );
`

const Logo = styled.img`
  width: 4.6rem;
  height: 4.6rem;
  flex: 0 0 auto;
  object-fit: contain;
  filter: drop-shadow(0 0 0.45rem rgba(255, 255, 255, 0.12));
`

const HeroText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
`

const ProductName = styled.div`
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: ${(props) => props.theme.colors.text.primary};
  line-height: 1.1;
`

const VersionLine = styled.div`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Tagline = styled.div`
  font-size: 0.88rem;
  font-weight: 600;
  color: #b8d4ff;
`

const Blurb = styled.div`
  font-size: 0.78rem;
  line-height: 1.35;
  color: ${(props) => props.theme.colors.text.secondary};
`

const CopyrightLine = styled.div`
  margin-top: 0.12rem;
  font-size: 0.72rem;
  color: ${(props) => props.theme.colors.text.secondary};
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

const AckRow = styled.div`
  font-size: 0.76rem;
  line-height: 1.35;
  color: ${(props) => props.theme.colors.text.secondary};
  padding-left: 0.15rem;
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
