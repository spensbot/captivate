import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import styled from 'styled-components'
import {
  type RemoteUiMode,
  resolveInitialRemoteUiMode,
  saveRemoteUiMode,
} from './remoteUiMode'

type RemoteUiModeContextValue = {
  mode: RemoteUiMode
  isMobile: boolean
  setMode: (mode: RemoteUiMode) => void
  toggleMode: () => void
}

const RemoteUiModeContext = createContext<RemoteUiModeContextValue | null>(null)

export function RemoteUiModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<RemoteUiMode>(resolveInitialRemoteUiMode)

  const setMode = useCallback((next: RemoteUiMode) => {
    setModeState(next)
    saveRemoteUiMode(next)
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === 'mobile' ? 'desktop' : 'mobile')
  }, [mode, setMode])

  const value = useMemo(
    () => ({
      mode,
      isMobile: mode === 'mobile',
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode]
  )

  return (
    <RemoteUiModeContext.Provider value={value}>
      <RemoteUiRoot data-remote-ui-mode={mode}>{children}</RemoteUiRoot>
    </RemoteUiModeContext.Provider>
  )
}

export function useRemoteUiMode(): RemoteUiModeContextValue {
  const ctx = useContext(RemoteUiModeContext)
  if (ctx === null) {
    throw new Error('useRemoteUiMode must be used within RemoteUiModeProvider')
  }
  return ctx
}

const RemoteUiRoot = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
`
