import { ThemeProvider } from 'styled-components'
import { ThemeProvider as MuiThemeProvider } from '@emotion/react'
import * as themes from './theme'
import { createTheme } from '@mui/material'
import { ReactNode } from 'react'

const theme = themes.dark()
const muiTheme = createTheme({
  palette: {
    mode: 'dark',
  },
})
export const CaptivateThemeProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  return (
    <ThemeProvider theme={theme}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeProvider>
  )
}
