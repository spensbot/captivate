import { memo } from 'react'
import StartIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import { send_user_command } from '../ipcHandler'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'
import { StatusBarPlayStopButton } from './statusBarUi'

function StartStopButton() {
  const isPlaying = useRealtimeSelector((rtState) => rtState.time.isPlaying)

  return (
    <StatusBarPlayStopButton
      type="button"
      $playing={isPlaying}
      title={isPlaying ? 'Stop show clock' : 'Start show clock'}
      onClick={() =>
        send_user_command({
          type: 'SetIsPlaying',
          isPlaying: !isPlaying,
        })
      }
    >
      {isPlaying ? <StopIcon fontSize="inherit" /> : <StartIcon fontSize="inherit" />}
    </StatusBarPlayStopButton>
  )
}

export default memo(StartStopButton)
