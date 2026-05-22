import styled from 'styled-components'
import { useRealtimeSelector } from '../renderer/redux/realtimeStore'
import { useControlSelector } from '../renderer/redux/store'
import { normalizeAudioInputSettings } from '../shared/audioEngine'

/** Read-only audio status for remote clients (capture runs on the show computer). */
export default function RemoteAudioPanel() {
  const audio = useRealtimeSelector((s) => s.audio)
  const settings = useControlSelector((s) =>
    normalizeAudioInputSettings(s.device.connectionSettings.audioInput)
  )

  return (
    <Wrap title="Audio runs on the show computer. Meters reflect live analysis there.">
      <Label>Audio</Label>
      <Meter $level={audio.inputLevel ?? 0} />
      <Meta>
        {settings.enabled ? 'On' : 'Off'}
        {settings.useBeatClock && audio.detectedBpm
          ? ` · ${Math.round(audio.detectedBpm)} BPM`
          : ''}
      </Meta>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.4rem;
  border-radius: 0.3rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  font-size: 0.68rem;
`

const Label = styled.span`
  color: ${(p) => p.theme.colors.text.secondary};
  font-weight: 600;
`

const Meter = styled.div<{ $level: number }>`
  width: 3rem;
  height: 0.35rem;
  border-radius: 2px;
  background: ${(p) => p.theme.colors.bg.primary};
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${(p) => Math.round(Math.max(0, Math.min(1, p.$level)) * 100)}%;
    background: linear-gradient(90deg, #3d8bfd, #78dc82);
  }
`

const Meta = styled.span`
  color: ${(p) => p.theme.colors.text.secondary};
  white-space: nowrap;
`
