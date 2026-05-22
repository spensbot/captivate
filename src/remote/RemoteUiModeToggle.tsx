import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import ComputerIcon from '@mui/icons-material/Computer'
import { useRemoteUiMode } from './RemoteUiModeContext'

export default function RemoteUiModeToggle() {
  const { mode, toggleMode } = useRemoteUiMode()
  const isMobile = mode === 'mobile'

  return (
    <Tooltip
      title={
        isMobile
          ? 'Switch to desktop layout'
          : 'Switch to mobile layout (larger touch controls)'
      }
      placement="bottom"
    >
      <IconButton
        onClick={toggleMode}
        aria-label={isMobile ? 'Use desktop layout' : 'Use mobile layout'}
        aria-pressed={isMobile}
        color={isMobile ? 'primary' : 'default'}
        size="medium"
      >
        {isMobile ? (
          <ComputerIcon fontSize="medium" />
        ) : (
          <SmartphoneIcon fontSize="medium" />
        )}
      </IconButton>
    </Tooltip>
  )
}
