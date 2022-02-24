import { useRef } from 'react'
import styled from 'styled-components'
import AdjustIcon from '@mui/icons-material/Adjust'
import IconButton from '@mui/material/IconButton'
import RollingAverage from '../../shared/RollingAverage'
import { send_user_command } from '../ipcHandler'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'

interface Props {}

const SLEEP_TIME = getMS(20) // milliseconds after which the tap tempo resets

function getBPM(ms: number) {
  return 60000 / ms
}

function getMS(bpm: number) {
  return 60000 / bpm
}

class TapTempoEngine {
  private avgBPM = new RollingAverage()
  private lastTapTime = 0
  // private taps = 0

  constructor() {
    this.avgBPM.setSustainSamples(3)
  }

  tap(currentBPM: number) {
    const now = Date.now()
    const period = now - this.lastTapTime
    this.lastTapTime = now
    if (period < SLEEP_TIME) {
      this.avgBPM.push(getBPM(period))
      send_user_command({ type: 'SetBPM', bpm: this.avgBPM.get() })
    } else {
      console.log(`resetting avgBPM: ${currentBPM}`)
      this.avgBPM.reset(currentBPM)
    }
  }
}

export default function TapTempo({}: Props) {
  const avg = useRef(new TapTempoEngine())
  const bpm = useRealtimeSelector((state) => state.time.bpm)

  const onClick = () => {
    avg.current.tap(bpm)
  }

  return (
    <IconButton onClick={onClick}>
      <AdjustIcon />
    </IconButton>
  )
}

const Root = styled.div``
