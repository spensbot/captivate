import styled from 'styled-components'
import { useRealtimeSelector } from '../../../../renderer/redux/realtimeStore'
import * as api from 'renderer/api'

interface Props {}

export default function StartStopSyncButton({}: Props) {
  const linkEnabled = useRealtimeSelector((state) => state.time.isEnabled)
  const sssEnabled = useRealtimeSelector(
    (state) => state.time.isStartStopSyncEnabled
  )

  const color = sssEnabled ? '#fff7' : '#fff3'

  if (!linkEnabled) return <PlaceHolder />

  return (
    <Root
      onClick={() =>
        api.mutations.user_command({
          type: 'EnableStartStopSync',
          isEnabled: !sssEnabled,
        })
      }
    >
      <Line color={color} />
      <CircleBg color={color} />
      <Breaker color={color} />
      <Circle enabled={sssEnabled} color={color} />
    </Root>
  )
}

const color = '#fff5'

const Root = styled.div`
  position: relative;
  /* opacity: 0.6; */
  /* cursor: pointer; */
  :hover {
    opacity: 1;
  }
`

const PlaceHolder = styled.div`
  width: 1rem;
`

const Line = styled.div`
  background-color: ${color};
  height: 0.1rem;
  width: 2.5rem;
  margin: 1rem 0;
`

const centerIt = `
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);`

const CircleBg = styled.div`
  margin: auto;
  border: 2px solid ${color};
  background-color: ${(props) => props.theme.colors.bg.primary};
  border-radius: 10rem;
  height: 1.2rem;
  width: 1.2rem;
  cursor: pointer;
  ${centerIt}
`
const Breaker = styled.div`
  height: 100%;
  width: 0.7rem;
  background-color: ${(props) => props.theme.colors.bg.primary};
  ${centerIt}
`
const Circle = styled.div<{ enabled: boolean }>`
  border-radius: 10rem;
  height: 0.9rem;
  width: 0.9rem;
  background-color: #fffa;
  /* background-color: #3d5a; */
  opacity: ${(props) => (props.enabled ? 1 : 0)};
  cursor: pointer;
  ${centerIt}
`
