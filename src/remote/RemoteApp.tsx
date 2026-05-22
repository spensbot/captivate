import { useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import Mixer from '../renderer/pages/Mixer'
import RemoteModulationPage from './RemoteModulationPage'
import RemoteStatusBar from './RemoteStatusBar'
import RemoteLogin from './RemoteLogin'
import Devices from '../renderer/overlays/Devices'
import { setConnectionsMenu } from '../renderer/redux/guiSlice'
import { useTypedSelector } from '../renderer/redux/store'

export type RemoteTab = 'modulation' | 'mixer'

export function RemoteAppShell({
  authenticated,
  authError,
  onRequestConnect,
  children,
}: {
  authenticated: boolean
  authError: string
  onRequestConnect: (url: string, pin: string) => void
  children: ReactNode
}) {
  if (!authenticated) {
    return <RemoteLogin error={authError} onConnect={onRequestConnect} />
  }
  return <>{children}</>
}

export default function RemoteApp() {
  const dispatch = useDispatch()
  const connectionMenu = useTypedSelector((state) => state.gui.connectionMenu)
  const [tab, setTab] = useState<RemoteTab>('modulation')

  return (
    <Root>
      <RemoteStatusBar />
      <TabRow>
        <TabButton
          type="button"
          $active={tab === 'modulation'}
          onClick={() => setTab('modulation')}
        >
          Scenes &amp; modulation
        </TabButton>
        <TabButton
          type="button"
          $active={tab === 'mixer'}
          onClick={() => setTab('mixer')}
        >
          DMX mixer
        </TabButton>
      </TabRow>
      <PageBody>
        {tab === 'modulation' ? (
          <RemoteModulationPage />
        ) : (
          <Mixer hideStatusBar />
        )}
      </PageBody>
      {connectionMenu ? (
        <OverlayBackdrop onClick={() => dispatch(setConnectionsMenu(false))}>
          <OverlayPanel onClick={(e) => e.stopPropagation()}>
            <Devices embedded />
          </OverlayPanel>
        </OverlayBackdrop>
      ) : null}
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: ${(p) => p.theme.colors.bg.darker};
`

const TabRow = styled.div`
  display: flex;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid ${(p) => p.theme.colors.divider};
  flex-shrink: 0;
`

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  border: 1px solid
    ${(p) => (p.$active ? p.theme.colors.text.primary : p.theme.colors.divider)};
  background: ${(p) =>
    p.$active ? p.theme.colors.bg.lighter : p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  border-radius: 0.35rem;
  padding: 0.45rem 0.5rem;
  font-size: 0.78rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  cursor: pointer;
`

const PageBody = styled.div`
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const OverlayBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 12000;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
`

const OverlayPanel = styled.div`
  width: min(420px, 92vw);
  height: 100%;
  overflow: auto;
  background: ${(p) => p.theme.colors.bg.darker};
  border-left: 1px solid ${(p) => p.theme.colors.divider};
  padding: 0.5rem;
`
