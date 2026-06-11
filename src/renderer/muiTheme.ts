import { createTheme } from '@mui/material/styles'
import { APP_TOOLTIP_SX } from './base/appTooltip'
import { overlayZIndex } from './zIndexes'

export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  zIndex: {
    modal: overlayZIndex.muiDialog,
    snackbar: overlayZIndex.muiDialog + 1,
    tooltip: overlayZIndex.tooltip,
  },
  components: {
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
        placement: 'top',
      },
      styleOverrides: {
        tooltip: {
          ...APP_TOOLTIP_SX,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
        },
        input: {
          color: '#ffffff',
          '&::placeholder': {
            color: 'rgba(255,255,255,0.45)',
            opacity: 1,
          },
        },
        notchedOutline: {
          borderColor: 'rgba(255,255,255,0.28)',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            backgroundColor: '#0a0a0a',
          },
        },
        input: {
          '&.Mui-disabled': {
            color: 'rgba(255,255,255,0.38)',
            WebkitTextFillColor: 'rgba(255,255,255,0.38)',
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
          '&:hover': {
            backgroundColor: '#0a0a0a',
          },
          '&.Mui-focused': {
            backgroundColor: '#000000',
          },
        },
        input: {
          color: '#ffffff',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.7)',
        },
      },
    },
  },
})
