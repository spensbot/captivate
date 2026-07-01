import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeProvider } from 'styled-components'
import GlobalStyle from '../renderer/GlobalStyle'
import { resolveThemePack } from '../renderer/theme'
import { Provider } from 'react-redux'
import {
  store,
  resetRemoteState,
  resetState,
  type CleanReduxState,
} from '../renderer/redux/store'
import initState from '../renderer/redux/initState'
import { setDmx, setMidi } from '../renderer/redux/guiSlice'
import {
  realtimeStore,
  realtimeContext,
  update as updateRealtimeStore,
} from '../renderer/redux/realtimeStore'
import { ThemeProvider as MuiThemeProvider } from '@emotion/react'
import { createMuiTheme } from '../renderer/muiTheme'
import {
  clearHostTransport,
  registerHostTransport,
} from '../shared/hostTransport'
import { bindRemoteSync } from './remoteIpc'
import { buildRemoteWebSocketUrl, RemoteSync } from './remoteSync'
import { RemoteAppShell } from './RemoteAppShell'
import RemoteErrorBoundary from './RemoteErrorBoundary'
import { RemoteUiModeProvider } from './RemoteUiModeContext'
import RemoteMobileGlobalStyle from './RemoteMobileGlobalStyle'
import { isRemoteDispatchAllowed } from '../shared/remoteControl'
import type { PayloadAction } from '@reduxjs/toolkit'
import { useTypedSelector } from '../renderer/redux/store'
import type { ThemePackId } from '../shared/appSettings'

function RemoteThemeProviders({ children }: { children: React.ReactNode }) {
  const themePackId = useTypedSelector(
    (state) => state.gui.appSettings?.themePackId ?? 'dark'
  ) as ThemePackId
  const theme = useMemo(() => resolveThemePack(themePackId), [themePackId])
  const muiTheme = useMemo(() => createMuiTheme(themePackId), [themePackId])

  return (
    <ThemeProvider theme={theme}>
      <MuiThemeProvider theme={muiTheme}>
        <GlobalStyle />
        <RemoteMobileGlobalStyle />
        {children}
      </MuiThemeProvider>
    </ThemeProvider>
  )
}

let _isApplyingRemoteState = false
let _isApplyingRemoteDispatch = false

function RemoteRoot() {
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')

  const sync = useMemo(
    () =>
      new RemoteSync({
        onAuthOk: () => {
          setAuthenticated(true)
          setAuthError('')
        },
        onAuthFail: (message) => {
          setAuthenticated(false)
          setAuthError(message)
        },
        onControlState: (state: CleanReduxState) => {
          _isApplyingRemoteState = true
          try {
            store.dispatch(resetRemoteState(state))
          } finally {
            _isApplyingRemoteState = false
          }
        },
        onTimeState: (state) => {
          realtimeStore.dispatch(updateRealtimeStore(state))
        },
        onDmxConnection: (payload) => {
          store.dispatch(setDmx(payload))
        },
        onMidiConnection: (payload) => {
          store.dispatch(setMidi(payload))
        },
        onDispatch: (action) => {
          _isApplyingRemoteDispatch = true
          try {
            store.dispatch(action as PayloadAction<unknown>)
          } finally {
            _isApplyingRemoteDispatch = false
          }
        },
        onStatus: () => undefined,
      }),
    []
  )

  useEffect(() => {
    bindRemoteSync(sync)
    registerHostTransport({
      sendDispatch: (action) => sync.sendDispatch(action),
      sendUserCommand: (command) => sync.sendUserCommand(command),
    })
    return () => {
      sync.disconnect()
      clearHostTransport()
    }
  }, [sync])

  const rawDispatch = store.dispatch.bind(store)
  ;(store as { dispatch: typeof store.dispatch }).dispatch = ((
    action: unknown
  ) => {
    if (
      !_isApplyingRemoteDispatch &&
      !_isApplyingRemoteState &&
      isRemoteDispatchAllowed(action)
    ) {
      // Host is authoritative — apply only via control_state to avoid duplicate scenes/actions.
      sync.sendDispatch(action as PayloadAction<unknown>)
      return action as ReturnType<typeof rawDispatch>
    }
    return rawDispatch(action as PayloadAction<unknown>)
  }) as typeof store.dispatch

  const handleConnect = useCallback(
    (pin: string) => {
      setAuthError('')
      setAuthenticated(false)
      try {
        const pageUrl = `${window.location.protocol}//${window.location.host}`
        const wsUrl = buildRemoteWebSocketUrl(pageUrl)
        sync.connect(wsUrl, pin)
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : String(e))
      }
    },
    [sync]
  )

  return (
    <RemoteAppShell
      authenticated={authenticated}
      authError={authError}
      onRequestConnect={handleConnect}
    />
  )
}

const appRoot = document.getElementById('root')
if (appRoot === null) {
  throw new Error('Remote root element (#root) was not found.')
}

// Seed Redux before first paint (remote has no main-process bootstrap snapshot yet).
store.dispatch(resetState(initState()))

createRoot(appRoot).render(
  <RemoteErrorBoundary>
    <Provider store={store}>
      <Provider store={realtimeStore} context={realtimeContext}>
        <RemoteThemeProviders>
          <RemoteUiModeProvider>
            <RemoteRoot />
          </RemoteUiModeProvider>
        </RemoteThemeProviders>
      </Provider>
    </Provider>
  </RemoteErrorBoundary>
)
