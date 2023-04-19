import StartIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import styled from 'styled-components'
import * as api from 'renderer/api'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'

export default function StartStopButton() {
  const time = useRealtimeSelector((rtState) => rtState.time)

  return (
    <Root
      onClick={() =>
        api.mutations.user_command({
          type: 'SetIsPlaying',
          isPlaying: !time.isPlaying,
        })
      }
    >
      {time.isPlaying ? <StopIcon /> : <StartIcon />}
    </Root>
  )
}

const Root = styled.div`
  /* border: 2px solid #fff5; */
  border-radius: 10rem;
  background-color: #3d5a;
  width: 2.3rem;
  height: 2.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`
