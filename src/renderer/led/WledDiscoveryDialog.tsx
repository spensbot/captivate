import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import styled from 'styled-components'
import { discoverWledControllers } from 'renderer/ipcHandler'
import { WledDiscoveredController } from 'shared/wledDiscovery'
import BusyModal from 'renderer/overlays/BusyModal'
import useStandardBusy from 'renderer/hooks/useStandardBusy'

interface Props {
  open: boolean
  initialHost: string
  onClose: () => void
  onSelect: (host: string) => void
}

export default function WledDiscoveryDialog({
  open,
  initialHost,
  onClose,
  onSelect,
}: Props) {
  const [manualHost, setManualHost] = useState(initialHost)
  const [results, setResults] = useState<WledDiscoveredController[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { busy, busyMessage, startBusy, stopBusy } = useStandardBusy()

  const runScan = useCallback(async () => {
    const busyId = startBusy({
      title: 'Scanning WLED Controllers',
      message: 'Searching local network for WLED devices...',
    })
    setIsScanning(true)
    setError(null)
    try {
      const discovered = await discoverWledControllers(2200)
      setResults(discovered)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WLED scan failed')
      setResults([])
    } finally {
      setIsScanning(false)
      stopBusy(busyId)
    }
  }, [startBusy, stopBusy])

  useEffect(() => {
    if (!open) return
    setManualHost(initialHost)
    void runScan()
  }, [open, initialHost, runScan])

  const canApplyManual = useMemo(() => manualHost.trim().length > 0, [manualHost])

  const applyHost = (host: string) => {
    const next = host.trim()
    if (next.length === 0) return
    onSelect(next)
    onClose()
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>WLED Controller Search</DialogTitle>
        <DialogContent dividers>
          <SearchRow>
            <Button variant="contained" size="small" onClick={runScan} disabled={isScanning}>
              {isScanning ? 'Scanning...' : 'Scan Network'}
            </Button>
            <Hint>Searches local network for WLED mDNS broadcasts.</Hint>
          </SearchRow>
          {error !== null && <ErrorText>{error}</ErrorText>}
          <Results>
            {results.length === 0 && (
              <EmptyHint>{isScanning ? 'Searching for controllers...' : 'No controllers found.'}</EmptyHint>
            )}
            {results.map((controller) => (
              <ResultRow key={`${controller.host}_${controller.ip ?? 'none'}`}>
                <ResultInfo>
                  <ResultName>{controller.name}</ResultName>
                  <ResultSub>
                    {controller.host}
                    {controller.ip ? ` (${controller.ip})` : ''}
                  </ResultSub>
                </ResultInfo>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => applyHost(controller.host)}
                >
                  Use
                </Button>
              </ResultRow>
            ))}
          </Results>
          <ManualSection>
            <ManualTitle>Manual Hostname or IP</ManualTitle>
            <ManualInput
              value={manualHost}
              onChange={(event) => setManualHost(event.target.value)}
              placeholder="wled.local or 192.168.1.55"
            />
          </ManualSection>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canApplyManual}
            onClick={() => applyHost(manualHost)}
          >
            Apply Host
          </Button>
        </DialogActions>
      </Dialog>
      <BusyModal
        open={busy !== null}
        title={busy?.title ?? 'Working...'}
        message={busyMessage}
        progress={busy?.progress}
      />
    </>
  )
}

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`

const Hint = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ErrorText = styled.div`
  margin-top: 0.55rem;
  font-size: 0.76rem;
  color: #ffb0b0;
`

const Results = styled.div`
  margin-top: 0.75rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.3rem;
  max-height: 16rem;
  overflow-y: auto;
`

const ResultRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};

  &:last-child {
    border-bottom: none;
  }
`

const ResultInfo = styled.div`
  min-width: 0;
`

const ResultName = styled.div`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text.primary};
`

const ResultSub = styled.div`
  font-size: 0.74rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const EmptyHint = styled.div`
  font-size: 0.78rem;
  color: ${(props) => props.theme.colors.text.secondary};
  padding: 0.8rem 0.6rem;
`

const ManualSection = styled.div`
  margin-top: 0.85rem;
`

const ManualTitle = styled.div`
  margin-bottom: 0.3rem;
  font-size: 0.76rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const ManualInput = styled.input`
  width: 100%;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.3rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  padding: 0.35rem 0.45rem;
  font-size: 0.82rem;
`
