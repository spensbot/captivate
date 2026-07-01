import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { laserDacListDevicesRequest } from '../ipcHandler'
import type { LaserDacDeviceInfo } from '../../shared/laserDac'
import { pickHeliosDeviceTarget } from './laserHeliosConnection'
import {
  LaserConnectionStatus,
  LaserFieldLabel,
  LaserInlineButton,
  LaserMuted,
  LaserSelect,
  LaserWizardHint,
} from './laserUi'

type Props = {
  connectionTarget: string
  onConnectionTargetChange: (target: string) => void
}

export default function LaserHeliosDeviceField({
  connectionTarget,
  onConnectionTargetChange,
}: Props) {
  const [devices, setDevices] = useState<LaserDacDeviceInfo[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [scanMessage, setScanMessage] = useState('')
  const connectionTargetRef = useRef(connectionTarget)
  connectionTargetRef.current = connectionTarget

  const refreshDevices = useCallback(async () => {
    setDevicesLoading(true)
    setScanMessage('')
    try {
      const result = await laserDacListDevicesRequest('helios')
      setDevices(result.devices)
      if (result.message) {
        setScanMessage(result.message)
      }
      if (result.devices.length > 0) {
        const next = pickHeliosDeviceTarget(
          result.devices,
          connectionTargetRef.current
        )
        if (next !== connectionTargetRef.current.trim()) {
          onConnectionTargetChange(next)
        }
      }
    } catch (e) {
      setDevices([])
      setScanMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setDevicesLoading(false)
    }
  }, [onConnectionTargetChange])

  useEffect(() => {
    void refreshDevices()
    // Scan USB once when this panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedId = pickHeliosDeviceTarget(devices, connectionTarget)
  const selected =
    devices.find((d) => d.id === selectedId) ?? devices[0] ?? null

  return (
    <Root>
      <LaserFieldLabel>Helios USB</LaserFieldLabel>
      {devicesLoading ? (
        <LaserMuted>Looking for Helios USB DAC…</LaserMuted>
      ) : devices.length === 1 && selected ? (
        <>
          <StatusRow>
            <LaserConnectionStatus $connected>Found</LaserConnectionStatus>
            <span>{selected.label}</span>
          </StatusRow>
          <LaserWizardHint>
            Helios is detected over USB. Click Test connection below to verify.
          </LaserWizardHint>
        </>
      ) : devices.length > 1 ? (
        <>
          <LaserWizardHint>
            {devices.length} Helios DACs connected — choose which one to use.
          </LaserWizardHint>
          <LaserSelect
            value={selectedId}
            onChange={(e) => onConnectionTargetChange(e.target.value)}
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </LaserSelect>
        </>
      ) : (
        <>
          <StatusRow>
            <LaserConnectionStatus $connected={false}>Not found</LaserConnectionStatus>
            <LaserMuted>Plug in the Helios USB cable, then click Refresh.</LaserMuted>
          </StatusRow>
          {scanMessage.length > 0 ? (
            <LaserWizardHint>{scanMessage}</LaserWizardHint>
          ) : null}
        </>
      )}
      <LaserInlineButton onClick={() => void refreshDevices()} disabled={devicesLoading}>
        {devicesLoading ? 'Scanning…' : 'Refresh'}
      </LaserInlineButton>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: ${(p) => p.theme.colors.text.primary};
`
