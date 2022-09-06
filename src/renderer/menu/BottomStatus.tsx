import styled from 'styled-components'
import { useTypedSelector } from 'renderer/redux/store'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'

export default function BottomStatus() {
  const isPlaying = useRealtimeSelector(
    (rtState) => rtState.time.link.isPlaying
  )
  const isMaster = useTypedSelector(
    (state) => state.control.present.master > 0.05
  )

  let message: string = 'All is well'
  let color: string | undefined = undefined
  let backgroundColor: string | undefined = undefined
  if (!isPlaying) {
    message = 'STOPPED! Press Play To Continue'
    color = '#fff'
    backgroundColor = '#d33'
  } else if (!isMaster) {
    message = 'MASTER LOW! Increase Master Slider To See Lights'
    color = '#fff'
    backgroundColor = '#d33'
  }

  return (
    <Root style={{ color, backgroundColor: backgroundColor }}>{message}</Root>
  )
}

const Root = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
  border-top: 1px solid #383838;
  padding: 0.2rem 0.5rem;
  user-select: text;
  background-color: ${(props) => props.theme.colors.bg.primary};
`
