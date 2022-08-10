import StartIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import { send_user_command } from '../ipcHandler'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'

export default function StartStopButton() {
  const time = useRealtimeSelector((rtState) => rtState.time)

  return (
    <Root>
      <IconButton
        size="medium"
        onClick={() =>
          send_user_command({
            type: 'SetIsPlaying',
            isPlaying: !time.isPlaying,
          })
        }
      >
        {time.isPlaying ? <StopIcon /> : <StartIcon />}
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`
