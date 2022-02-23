import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../redux/store'
import OfflineBoltIcon from '@mui/icons-material/OfflineBolt'
import PlayIcon from '@mui/icons-material/PlayArrow'
// import PlayIcon from '@mui/icons-material/PlayCircle'
// import PlayIcon from '@mui/icons-material/PlayCircleOutline'
import PauseIcon from '@mui/icons-material/Pause'
// import PauseIcon from '@mui/icons-material/PauseCircle'
// import PauseIcon from '@mui/icons-material/PauseCircleOutline'
import { setBlackout } from '../redux/guiSlice'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'

export default function PlayPauseButton() {
  const dispatch = useDispatch()
  const blackout = useTypedSelector((state) => state.gui.blackout)

  const [isPlaying, setIsPlaying] = useState(true)

  return (
    <Root>
      <IconButton size="large" onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 0.5rem;
`
