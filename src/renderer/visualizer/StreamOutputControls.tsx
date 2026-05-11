import { Alert, Button, Collapse, TextField } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Select from 'renderer/base/Select'
import styled from 'styled-components'
import { useEffect, useMemo, useState } from 'react'
import {
  detectVisualizerNdiRuntime,
  getVisualizerStreamingSettings,
  getVisualizerStreamState,
  getVisStreamHealth,
  saveVisualizerStreamingSettings,
  startVisualizerStream,
  stopVisualizerStream,
} from 'renderer/ipcHandler'
import {
  VisualizerNdiRuntimeDetection,
  initVisualizerStreamConfig,
  initVisualizerStreamState,
  RtspTransport,
  VisualizerStreamConfig,
  VisualizerStreamProtocol,
  VisualizerStreamState,
  VisStreamHealth,
} from 'shared/visualizerStreaming'

const rtspTransportOptions: RtspTransport[] = ['tcp', 'udp']

const PROTOCOL_OPTIONS: VisualizerStreamProtocol[] = ['RTSP', 'NDI']

function normalizeProtocol(p: unknown): VisualizerStreamProtocol {
  if (typeof p === 'string' && p.trim().toUpperCase() === 'NDI') return 'NDI'
  return 'RTSP'
}

export default function StreamOutputControls() {
  const [config, setConfig] = useState<VisualizerStreamConfig>(
    initVisualizerStreamConfig()
  )
  const [state, setState] = useState<VisualizerStreamState>(
    initVisualizerStreamState()
  )
  const [health, setHealth] = useState<VisStreamHealth | null>(null)
  const [ndiDetection, setNdiDetection] =
    useState<VisualizerNdiRuntimeDetection | null>(null)
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [ndiMachinePanelOpen, setNdiMachinePanelOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadDefaults = async () => {
      try {
        const settings = await getVisualizerStreamingSettings()
        if (!mounted) return

        setConfig((prev) => ({
          ...prev,
          ffmpegPath: settings.defaultFfmpegPath,
          ndiRuntimePath: settings.ndiRuntimePath,
          protocol: normalizeProtocol(prev.protocol),
        }))

        const detection = await detectVisualizerNdiRuntime()
        if (!mounted) return

        setNdiDetection(detection)
        if (
          settings.ndiRuntimePath.trim().length === 0 &&
          detection.bestPath !== null
        ) {
          setConfig((prev) => ({
            ...prev,
            ndiRuntimePath: detection.bestPath ?? '',
          }))
          await saveVisualizerStreamingSettings({
            ndiRuntimePath: detection.bestPath,
          })
          if (mounted) {
            setSettingsMessage(`Using detected NDI runtime: ${detection.bestPath}`)
          }
        }
      } catch (err) {
        if (mounted) {
          setSettingsMessage(`Failed to load streaming defaults: ${String(err)}`)
        }
      }
    }

    void loadDefaults()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (config.protocol !== 'NDI') {
      setNdiMachinePanelOpen(false)
    }
  }, [config.protocol])

  useEffect(() => {
    let mounted = true

    const refreshStatus = () => {
      getVisualizerStreamState()
        .then((nextState) => {
          if (mounted) {
            setState(nextState)
          }
        })
        .catch((_err) => {})
    }

    const refreshHealth = () => {
      getVisStreamHealth(config)
        .then((nextHealth) => {
          if (mounted) {
            setHealth(nextHealth)
          }
        })
        .catch((_err) => {})
    }

    refreshStatus()
    refreshHealth()
    const statusInterval = setInterval(refreshStatus, 1500)
    const healthInterval = setInterval(refreshHealth, 5000)

    return () => {
      mounted = false
      clearInterval(statusInterval)
      clearInterval(healthInterval)
    }
  }, [config])

  const onStart = async () => {
    setIsBusy(true)
    try {
      setState(await startVisualizerStream(config))
    } catch (err) {
      setState({
        status: 'error',
        protocol: config.protocol,
        message: String(err),
      })
    } finally {
      setIsBusy(false)
    }
  }

  const onStop = async () => {
    setIsBusy(true)
    try {
      setState(await stopVisualizerStream())
    } catch (err) {
      setState({
        status: 'error',
        protocol: config.protocol,
        message: String(err),
      })
    } finally {
      setIsBusy(false)
    }
  }

  const saveDefaults = async () => {
    try {
      const nextSettings = await saveVisualizerStreamingSettings({
        defaultFfmpegPath: config.ffmpegPath,
        ndiRuntimePath: config.ndiRuntimePath,
      })
      setSettingsMessage(
        `Saved defaults (FFmpeg: ${nextSettings.defaultFfmpegPath}, NDI runtime: ${
          nextSettings.ndiRuntimePath || 'auto'
        })`
      )
    } catch (err) {
      setSettingsMessage(`Failed to save defaults: ${String(err)}`)
    }
  }

  const autoDetectNdiRuntime = async () => {
    try {
      const detection = await detectVisualizerNdiRuntime()
      setNdiDetection(detection)
      if (detection.bestPath !== null) {
        setConfig((prev) => ({
          ...prev,
          ndiRuntimePath: detection.bestPath ?? '',
        }))
        await saveVisualizerStreamingSettings({
          ndiRuntimePath: detection.bestPath,
        })
        setSettingsMessage(`Using NDI runtime at ${detection.bestPath}`)
      } else {
        setSettingsMessage('No local NDI runtime installation detected.')
      }
    } catch (err) {
      setSettingsMessage(`NDI runtime detection failed: ${String(err)}`)
    }
  }

  const openNdiRuntimeDownload = () => {
    const url =
      health?.ndi.downloadUrl ||
      ndiDetection?.downloadUrl ||
      'https://ndi.video/tools/ndi-runtime/'
    window.open(url, '_blank')
  }

  const refreshHealth = async () => {
    try {
      setHealth(await getVisStreamHealth(config))
    } catch (_err) {}
  }

  const isStreaming = state.status === 'running'
  const controlsLocked = isBusy || isStreaming

  const streamStateLabel =
    state.status === 'running'
      ? 'Running'
      : state.status === 'error'
      ? 'Error'
      : state.status === 'starting'
      ? 'Starting'
      : 'Stopped'

  const streamTarget = useMemo(() => {
    if (config.protocol === 'NDI') {
      return config.ndiName.trim().length > 0
        ? config.ndiName.trim()
        : 'Captivate Visualizer'
    }

    const url = config.rtspUrl.trim()
    if (url.length === 0) {
      return 'rtsp://127.0.0.1:8554/captivate'
    }

    return url
  }, [config.ndiName, config.protocol, config.rtspUrl])

  const showNdiWarning =
    config.protocol === 'NDI' && health !== null && !health.ndi.supported

  return (
    <Root>
      {showNdiWarning && (
        <Alert severity="warning">
          {health?.ndi.message ||
            'NDI output is unavailable. Install NDI Runtime and confirm SDK availability.'}
        </Alert>
      )}

      <Section>
        <SectionTitle>Streaming</SectionTitle>
        <FieldRow>
          <Label>Protocol</Label>
          <Select
            label="Protocol"
            val={normalizeProtocol(config.protocol)}
            items={PROTOCOL_OPTIONS}
            disabled={controlsLocked}
            onChange={(protocol) => {
              setConfig((prev) => ({
                ...prev,
                protocol,
                fps:
                  protocol === 'NDI'
                    ? Math.max(prev.fps, 60)
                    : prev.fps === 60
                    ? 30
                    : prev.fps,
              }))
            }}
          />
        </FieldRow>

        <FieldRow>
          <Label>FPS</Label>
          <SmallInput
            size="small"
            type="number"
            disabled={controlsLocked}
            value={config.fps}
            onChange={(e) => {
              const fps = Number(e.target.value)
              if (!Number.isFinite(fps)) return
              setConfig({ ...config, fps })
            }}
          />
        </FieldRow>

        {config.protocol === 'RTSP' ? (
          <>
            <FieldRow>
              <Label>RTSP URL</Label>
              <LargeInput
                size="small"
                disabled={controlsLocked}
                value={config.rtspUrl}
                onChange={(e) =>
                  setConfig({ ...config, rtspUrl: e.target.value })
                }
              />
            </FieldRow>
            <FieldRow>
              <Label>Transport</Label>
              <Select
                label="Transport"
                val={config.rtspTransport}
                items={rtspTransportOptions}
                onChange={(rtspTransport) =>
                  setConfig({ ...config, rtspTransport })
                }
                disabled={controlsLocked}
              />
            </FieldRow>
            <FieldRow>
              <Label>Bitrate kbps</Label>
              <SmallInput
                size="small"
                type="number"
                disabled={controlsLocked}
                value={config.bitrateKbps}
                onChange={(e) => {
                  const bitrateKbps = Number(e.target.value)
                  if (!Number.isFinite(bitrateKbps)) return
                  setConfig({ ...config, bitrateKbps })
                }}
              />
            </FieldRow>
            <FieldRow>
              <Label>FFmpeg</Label>
              <LargeInput
                size="small"
                disabled={controlsLocked}
                value={config.ffmpegPath}
                onChange={(e) =>
                  setConfig({ ...config, ffmpegPath: e.target.value })
                }
              />
            </FieldRow>
          </>
        ) : (
          <>
            <FieldRow>
              <Label>NDI Source</Label>
              <LargeInput
                size="small"
                disabled={controlsLocked}
                value={config.ndiName}
                onChange={(e) =>
                  setConfig({ ...config, ndiName: e.target.value })
                }
              />
            </FieldRow>
            <FieldRow>
              <Label>NDI Runtime</Label>
              <LargeInput
                size="small"
                disabled={controlsLocked}
                value={config.ndiRuntimePath}
                onChange={(e) =>
                  setConfig({ ...config, ndiRuntimePath: e.target.value })
                }
              />
            </FieldRow>
            <Buttons>
              <Button
                variant="outlined"
                size="small"
                disabled={controlsLocked}
                onClick={autoDetectNdiRuntime}
              >
                Auto Detect Runtime
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={controlsLocked}
                onClick={openNdiRuntimeDownload}
              >
                Download Runtime
              </Button>
            </Buttons>
          </>
        )}

        <Buttons>
          <Button
            variant="outlined"
            size="small"
            disabled={controlsLocked}
            onClick={saveDefaults}
          >
            Save Defaults
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={controlsLocked}
            onClick={onStart}
          >
            Start Stream
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={isBusy || !isStreaming}
            onClick={onStop}
          >
            Stop Stream
          </Button>
        </Buttons>
      </Section>

      <Section>
        <SectionTitle>Diagnostics</SectionTitle>
        <Buttons>
          <Button variant="outlined" size="small" onClick={refreshHealth}>
            Refresh
          </Button>
        </Buttons>

        <DiagLine>
          Stream State: <strong>{streamStateLabel}</strong>
        </DiagLine>
        <DiagLine>
          {config.protocol === 'NDI' ? 'NDI Source' : 'RTSP Stream'}:{' '}
          <strong>{streamTarget}</strong>
        </DiagLine>

        {config.protocol === 'NDI' ? (
          <>
            <DiagLine>
              NDI Status:{' '}
              <strong>{health?.ndi.supported ? 'Ready' : 'Unavailable'}</strong>
            </DiagLine>
            <DiagLine>
              SDK / muxer path:{' '}
              <strong>
                {health === null
                  ? '—'
                  : health.ndi.delivery === 'native_sdk'
                  ? 'Native SDK'
                  : health.ndi.delivery === 'ffmpeg_muxer'
                  ? 'FFmpeg muxer'
                  : 'None'}
              </strong>
            </DiagLine>
          </>
        ) : (
          <>
            <DiagLine>
              RTSP Status:{' '}
              <strong>{health?.ffmpeg.exists ? 'Ready' : 'Unavailable'}</strong>
            </DiagLine>
            <DiagLine>
              FFmpeg:{' '}
              <strong>{health?.ffmpeg.exists ? 'Detected' : 'Missing'}</strong>
            </DiagLine>
          </>
        )}

        {config.protocol === 'NDI' ? (
          <NdiOptionalFold>
            <NdiOptionalHead
              type="button"
              id="ndi-machine-panel-trigger"
              aria-expanded={ndiMachinePanelOpen}
              aria-controls="ndi-machine-panel-body"
              onClick={() => setNdiMachinePanelOpen((v) => !v)}
            >
              <NdiOptionalHeadLabel>
                <NdiOptionalHeadTitle>NDI on this machine</NdiOptionalHeadTitle>
                <NdiOptionalHeadSub>Optional · expand for capability detail</NdiOptionalHeadSub>
              </NdiOptionalHeadLabel>
              <ExpandMoreIcon
                sx={{
                  flexShrink: 0,
                  color: 'text.secondary',
                  transition: 'transform 0.2s ease',
                  transform: ndiMachinePanelOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </NdiOptionalHead>
            <Collapse in={ndiMachinePanelOpen} timeout="auto">
              <div id="ndi-machine-panel-body">
                <NdiStatusPanel>
                  <NdiStatusGrid>
                    <span>Ready</span>
                    <NdiStatusValue $ok={health?.ndi.supported === true}>
                      {health === null
                        ? 'Checking…'
                        : health.ndi.supported
                        ? 'Yes'
                        : 'No'}
                    </NdiStatusValue>
                    <span>Output path</span>
                    <NdiStatusValue
                      $ok={health !== null && health.ndi.delivery !== 'none'}
                    >
                      {health === null
                        ? '—'
                        : health.ndi.delivery === 'native_sdk'
                        ? 'Native NDI SDK (in-app)'
                        : health.ndi.delivery === 'ffmpeg_muxer'
                        ? 'FFmpeg libndi_newtek'
                        : 'Unavailable'}
                    </NdiStatusValue>
                    <span>NDI runtime libs</span>
                    <NdiStatusValue $ok={health?.ndi.runtimeReady === true}>
                      {health === null
                        ? '—'
                        : health.ndi.runtimeReady
                        ? 'Found'
                        : 'Not found'}
                    </NdiStatusValue>
                    <span>FFmpeg {health?.ndi.requestedMuxer ?? 'libndi_newtek'}</span>
                    <NdiStatusValue $ok={health?.ndi.ffmpegMuxerSupported === true}>
                      {health === null
                        ? '—'
                        : health.ndi.ffmpegMuxerSupported
                        ? 'Available in FFmpeg'
                        : 'Not in this FFmpeg build'}
                    </NdiStatusValue>
                    <span>Native SDK load</span>
                    <NdiStatusValue $ok={health?.ndi.nativeSdkSupported === true}>
                      {health === null
                        ? '—'
                        : health.ndi.nativeSdkSupported
                        ? 'Runtime DLLs resolved'
                        : 'Not resolved'}
                    </NdiStatusValue>
                  </NdiStatusGrid>
                  {health !== null && health.ndi.message.length > 0 && (
                    <NdiStatusHint>{health.ndi.message}</NdiStatusHint>
                  )}
                  {ndiDetection !== null && ndiDetection.foundPaths.length > 0 && (
                    <NdiStatusHint>
                      Scan: {ndiDetection.foundPaths.slice(0, 4).join(' · ')}
                      {ndiDetection.foundPaths.length > 4
                        ? ` (+${ndiDetection.foundPaths.length - 4} more)`
                        : ''}
                    </NdiStatusHint>
                  )}
                </NdiStatusPanel>
              </div>
            </Collapse>
          </NdiOptionalFold>
        ) : null}
      </Section>

      {settingsMessage && <Status status="idle">{settingsMessage}</Status>}
      <Status status={state.status}>{state.message}</Status>
    </Root>
  )
}

const Root = styled.div`
  width: min(48rem, 100%);
  padding: 1rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`

const SectionTitle = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 8rem 1fr;
  align-items: center;
  gap: 0.5rem;
`

const Label = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.8rem;
`

const SmallInput = styled(TextField)`
  input {
    font-size: 0.8rem;
  }
`

const LargeInput = styled(TextField)`
  input {
    font-size: 0.8rem;
  }
`

const Buttons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const Status = styled.div<{ status: VisualizerStreamState['status'] }>`
  font-size: 0.78rem;
  color: ${(props) =>
    props.status === 'error'
      ? '#ff8a80'
      : props.status === 'running'
      ? '#81c784'
      : props.theme.colors.text.secondary};
  word-break: break-word;
`

const DiagLine = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.8rem;
  word-break: break-word;
`

const NdiOptionalFold = styled.div`
  margin-top: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0;
`

const NdiOptionalHead = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  margin: 0;
  padding: 0.45rem 0.5rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.18);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;

  &:hover {
    background: rgba(0, 0, 0, 0.28);
    border-color: rgba(255, 255, 255, 0.18);
  }
`

const NdiOptionalHeadLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
`

const NdiOptionalHeadTitle = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(props) => props.theme.colors.text.secondary};
`

const NdiOptionalHeadSub = styled.span`
  font-size: 0.68rem;
  color: ${(props) => props.theme.colors.text.secondary};
  opacity: 0.88;
`

const NdiStatusPanel = styled.div`
  border-radius: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.22);
  padding: 0.5rem 0.6rem;
  margin-top: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const NdiStatusGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(7.5rem, auto) 1fr;
  gap: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const NdiStatusValue = styled.span<{ $ok?: boolean }>`
  color: ${(props) =>
    props.$ok === true
      ? '#9de6b4'
      : props.$ok === false
      ? '#ffb4a8'
      : props.theme.colors.text.primary};
  font-weight: 600;
`

const NdiStatusHint = styled.div`
  font-size: 0.68rem;
  color: ${(props) => props.theme.colors.text.secondary};
  line-height: 1.35;
`
