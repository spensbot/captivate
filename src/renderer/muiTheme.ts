import { createTheme, type Theme } from '@mui/material/styles'
import { APP_TOOLTIP_SX } from './base/appTooltip'
import { overlayZIndex } from './zIndexes'
import type { ThemePackId } from '../shared/appSettings'

const sharedZIndex = {
  modal: overlayZIndex.muiDialog,
  snackbar: overlayZIndex.muiDialog + 1,
  tooltip: overlayZIndex.tooltip,
}

const sharedComponents = {
  MuiPopover: {
    styleOverrides: {
      root: {
        zIndex: overlayZIndex.muiMenu,
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      enterDelay: 400,
      placement: 'top' as const,
    },
    styleOverrides: {
      tooltip: {
        ...APP_TOOLTIP_SX,
      },
    },
  },
}

function inputOverrides(isLight: boolean) {
  const text = isLight ? '#141414' : '#ffffff'
  const placeholder = isLight ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.45)'
  const outline = isLight ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.28)'
  const fieldBg = isLight ? '#ffffff' : '#000000'
  const disabledBg = isLight ? '#f0f0f0' : '#0a0a0a'
  const disabledText = isLight ? 'rgba(0, 0, 0, 0.38)' : 'rgba(255, 255, 255, 0.38)'
  const label = isLight ? 'rgba(0, 0, 0, 0.68)' : 'rgba(255, 255, 255, 0.7)'

  return {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: fieldBg,
        },
        input: {
          color: text,
          '&::placeholder': {
            color: placeholder,
            opacity: 1,
          },
        },
        notchedOutline: {
          borderColor: outline,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            backgroundColor: disabledBg,
          },
        },
        input: {
          '&.Mui-disabled': {
            color: disabledText,
            WebkitTextFillColor: disabledText,
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: fieldBg,
          '&:hover': {
            backgroundColor: isLight ? '#f5f5f5' : '#0a0a0a',
          },
          '&.Mui-focused': {
            backgroundColor: fieldBg,
          },
        },
        input: {
          color: text,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: label,
        },
      },
    },
  }
}

function iconOverrides(isLight: boolean) {
  const primary = isLight ? 'rgba(0, 0, 0, 0.72)' : 'rgba(255, 255, 255, 0.86)'
  const secondary = isLight ? 'rgba(0, 0, 0, 0.54)' : 'rgba(255, 255, 255, 0.68)'

  return {
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: primary,
          '&:hover': {
            color: isLight ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.95)',
          },
          '&.Mui-disabled': {
            color: isLight ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
          },
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          color: secondary,
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          color: isLight ? 'rgba(0, 0, 0, 0.78)' : 'rgba(255, 255, 255, 0.82)',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: isLight ? '#757575' : '#bdbdbd',
        },
        track: {
          backgroundColor: isLight ? '#9e9e9e' : '#616161',
        },
      },
    },
  }
}

export function createMuiTheme(themePackId: ThemePackId): Theme {
  const isLight = themePackId === 'light'

  return createTheme({
    palette: {
      mode: isLight ? 'light' : 'dark',
      ...(isLight
        ? {
            background: {
              default: '#eeeeee',
              paper: '#ffffff',
            },
            text: {
              primary: '#141414',
              secondary: '#444444',
              disabled: 'rgba(0, 0, 0, 0.38)',
            },
            action: {
              active: 'rgba(0, 0, 0, 0.68)',
              disabled: 'rgba(0, 0, 0, 0.26)',
            },
            divider: 'rgba(0, 0, 0, 0.14)',
          }
        : {
            text: {
              primary: '#ececec',
              secondary: '#a8a8a8',
            },
            action: {
              active: 'rgba(255, 255, 255, 0.78)',
            },
          }),
    },
    zIndex: sharedZIndex,
    components: {
      ...sharedComponents,
      ...inputOverrides(isLight),
      ...iconOverrides(isLight),
    },
  })
}

/** Default dark MUI theme (remote entry and legacy imports). */
export const muiTheme = createMuiTheme('dark')
