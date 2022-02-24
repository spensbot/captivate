import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../redux/store'
import PlayIcon from '@mui/icons-material/PlayArrow'
// import PlayIcon from '@mui/icons-material/PlayCircle'
// import PlayIcon from '@mui/icons-material/PlayCircleOutline'
import PauseIcon from '@mui/icons-material/Pause'
// import PauseIcon from '@mui/icons-material/PauseCircle'
// import PauseIcon from '@mui/icons-material/PauseCircleOutline'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import { send_user_command } from '../ipcHandler'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'

export default function PlayPauseButton() {
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
        {time.isPlaying ? <PauseIcon /> : <PlayIcon />}
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`
