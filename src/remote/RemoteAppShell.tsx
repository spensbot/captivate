import { lazy, Suspense } from 'react'
import styled from 'styled-components'
import RemoteLogin from './RemoteLogin'

const RemoteApp = lazy(() => import('./RemoteApp'))

export function RemoteAppShell({
  authenticated,
  authError,
  onRequestConnect,
}: {
  authenticated: boolean
  authError: string
  onRequestConnect: (pin: string) => void
}) {
  if (!authenticated) {
    return <RemoteLogin error={authError} onConnect={onRequestConnect} />
  }
  return (
    <Suspense fallback={<Loading>Loading remote workspace…</Loading>}>
      <RemoteApp />
    </Suspense>
  )
}

const Loading = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: ${(p) => p.theme.colors.text.secondary};
  font-size: 0.85rem;
`
