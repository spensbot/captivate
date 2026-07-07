import { useState } from 'react'
import { useDispatch } from 'react-redux'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import { useControlSelector } from '../redux/store'
import { setAudioBpmRangePreset } from '../redux/controlSlice'
import {
  AUDIO_BPM_RANGE_PRESET_OPTIONS,
  formatAudioBpmRangeLabel,
  normalizeAudioInputSettings,
  type AudioBpmRangePresetId,
} from '../../shared/audioEngine'
import { StatusBarBpmRangeButton, StatusBarBpmRangeButtonLabel } from './statusBarUi'

export default function BpmRangeLockDropdown() {
  const dispatch = useDispatch()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const settings = useControlSelector((state) =>
    normalizeAudioInputSettings(state.device.connectionSettings.audioInput)
  )
  const preset = settings.audioBpmRangePreset
  const rangeLabel = formatAudioBpmRangeLabel(settings)
  const menuOpen = anchorEl !== null

  const selectPreset = (next: AudioBpmRangePresetId) => {
    dispatch(setAudioBpmRangePreset(next))
    setAnchorEl(null)
  }

  return (
    <>
      <StatusBarBpmRangeButton
        type="button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        title="Lock audio BPM detection to a known tempo range"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <StatusBarBpmRangeButtonLabel>{rangeLabel}</StatusBarBpmRangeButtonLabel>
        <ArrowDropDownIcon />
      </StatusBarBpmRangeButton>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 'min(18rem, calc(100vw - 24px))',
            },
          },
        }}
      >
        {AUDIO_BPM_RANGE_PRESET_OPTIONS.map((option) => (
          <MenuItem
            key={option.id}
            selected={preset === option.id}
            onClick={() => selectPreset(option.id)}
          >
            <ListItemText
              primary={option.label}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
