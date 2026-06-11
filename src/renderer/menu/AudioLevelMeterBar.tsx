import { memo } from 'react'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Tooltip from '@mui/material/Tooltip'
import styled from 'styled-components'
import { useRealtimeSelector } from '../redux/realtimeStore'
import { STATUS_BAR_AUDIO_METER_WIDTH, STATUS_BAR_CONTROL_HEIGHT, STATUS_BAR_INLINE_METER_HEIGHT } from './statusBarUi'

function levelPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.min(1, Math.max(0, value)) * 100)
}

function AudioLevelMeterBar() {
  const inputLevel = useRealtimeSelector((state) => state.audio.inputLevel)
  const level = Math.min(1, Math.max(0, Number(inputLevel) || 0))
  const percent = levelPercent(level)

  return (
    <Tooltip
      title={`Audio input level: ${percent}%`}
      placement="bottom"
      enterDelay={400}
    >
      <Root aria-label={`Audio input level ${percent}%`}>
        <SpeakerIcon aria-hidden="true" />
        <Track>
          <Fill style={{ width: `${percent}%` }} />
        </Track>
      </Root>
    </Tooltip>
  )
}

export default memo(AudioLevelMeterBar)

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
  min-width: 0;
  height: ${STATUS_BAR_CONTROL_HEIGHT};
  padding: 0 0.15rem;
`

const SpeakerIcon = styled(VolumeUpIcon)`
  && {
    font-size: 1.35rem;
    color: ${(p) => p.theme.colors.text.secondary};
    flex-shrink: 0;
  }
`

const Track = styled.div`
  width: ${STATUS_BAR_AUDIO_METER_WIDTH};
  height: ${STATUS_BAR_INLINE_METER_HEIGHT};
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 999px;
  overflow: hidden;
  background: ${(p) => p.theme.colors.bg.darker};
  box-shadow: ${(p) => p.theme.elevation.insetDepth};
`

const Fill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, rgba(70, 150, 210, 0.9), rgba(110, 190, 130, 0.95));
`
