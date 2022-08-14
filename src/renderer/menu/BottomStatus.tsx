import styled from 'styled-components'
import { useTypedSelector } from 'renderer/redux/store'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'

export default function BottomStatus() {
  const isPlaying = useRealtimeSelector((rtState) => rtState.time.isPlaying)
  const isMaster = useTypedSelector(
    (state) => state.control.present.master > 0.05
  )

  let warning: string | null = null
  if (!isMaster) warning = 'MASTER OFF! Increase Master Slider To See Lights'
  if (!isPlaying) warning = 'STOPPED! Press Play To Continue'

  return <Root>{warning}</Root>
}

const Root = styled.div``
