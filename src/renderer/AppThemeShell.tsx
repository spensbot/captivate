import { useMemo } from 'react'
import { ThemeProvider } from 'styled-components'
import { ThemeProvider as MuiThemeProvider } from '@emotion/react'
import { useTypedSelector } from './redux/store'
import { resolveThemePack } from './theme'
import { muiTheme } from './muiTheme'

type Props = {
  children: React.ReactNode
}

export default function AppThemeShell({ children }: Props) {
  const themePackId = useTypedSelector((state) => state.gui.appSettings.themePackId)
  const theme = useMemo(() => resolveThemePack(themePackId), [themePackId])

  return (
    <ThemeProvider theme={theme}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeProvider>
  )
}
