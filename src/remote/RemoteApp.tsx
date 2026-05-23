import { lazy, Suspense, useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import RemoteModulationPage from './RemoteModulationPage'
import RemoteStatusBar from './RemoteStatusBar'
import Devices from '../renderer/overlays/Devices'
import { setConnectionsMenu } from '../renderer/redux/guiSlice'
import { useTypedSelector } from '../renderer/redux/store'
import { useRemoteUiMode } from './RemoteUiModeContext'

const Mixer = lazy(() => import('../renderer/pages/Mixer'))

export type RemoteTab = 'modulation' | 'mixer'

export default function RemoteApp() {
  const dispatch = useDispatch()
  const connectionMenu = useTypedSelector((state) => state.gui.connectionMenu)
  const { isMobile } = useRemoteUiMode()
  const [tab, setTab] = useState<RemoteTab>('modulation')

  return (
    <Root>
      <RemoteStatusBar />
      <TabRow $mobile={isMobile}>
        <TabButton
          type="button"
          $active={tab === 'modulation'}
          $mobile={isMobile}
          onClick={() => setTab('modulation')}
        >
          Scenes &amp; modulation
        </TabButton>
        <TabButton
          type="button"
          $active={tab === 'mixer'}
          $mobile={isMobile}
          onClick={() => setTab('mixer')}
        >
          DMX mixer
        </TabButton>
      </TabRow>
      <PageBody>
        {tab === 'modulation' ? (
          <RemoteModulationPage />
        ) : (
          <Suspense fallback={<TabLoading $mobile={isMobile}>Loading DMX mixer…</TabLoading>}>
            <Mixer hideStatusBar />
          </Suspense>
        )}
      </PageBody>
      {connectionMenu ? (
        <OverlayBackdrop onClick={() => dispatch(setConnectionsMenu(false))}>
          <OverlayPanel $mobile={isMobile} onClick={(e) => e.stopPropagation()}>
            <Devices embedded hideRemoteControl />
          </OverlayPanel>
        </OverlayBackdrop>
      ) : null}
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${(p) => p.theme.colors.bg.darker};
`

const TabRow = styled.div<{ $mobile: boolean }>`
  display: flex;
  gap: ${(p) => (p.$mobile ? '0.5rem' : '0.35rem')};
  padding: ${(p) => (p.$mobile ? '0.5rem 0.65rem' : '0.35rem 0.5rem')};
  border-bottom: 1px solid ${(p) => p.theme.colors.divider};
  flex-shrink: 0;
`

const TabButton = styled.button<{ $active: boolean; $mobile: boolean }>`
  flex: 1;
  border: 1px solid
    ${(p) => (p.$active ? p.theme.colors.text.primary : p.theme.colors.divider)};
  background: ${(p) =>
    p.$active ? p.theme.colors.bg.lighter : p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  border-radius: ${(p) => (p.$mobile ? '0.45rem' : '0.35rem')};
  padding: ${(p) => (p.$mobile ? '0.75rem 0.5rem' : '0.45rem 0.5rem')};
  min-height: ${(p) => (p.$mobile ? '3rem' : 'auto')};
  font-size: ${(p) => (p.$mobile ? '0.95rem' : '0.78rem')};
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  cursor: pointer;
  touch-action: manipulation;
`

const PageBody = styled.div`
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const TabLoading = styled.div<{ $mobile: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(p) => p.theme.colors.text.secondary};
  font-size: ${(p) => (p.$mobile ? '0.95rem' : '0.78rem')};
`

const OverlayBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 12000;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;

  [data-remote-ui-mode='mobile'] & {
    justify-content: center;
    align-items: flex-end;
  }
`

const OverlayPanel = styled.div<{ $mobile: boolean }>`
  width: ${(p) => (p.$mobile ? '100%' : 'min(420px, 92vw)')};
  max-width: 100%;
  height: ${(p) => (p.$mobile ? 'min(92dvh, 100%)' : '100%')};
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: ${(p) => p.theme.colors.bg.darker};
  border-left: ${(p) =>
    p.$mobile ? 'none' : `1px solid ${p.theme.colors.divider}`};
  border-top: ${(p) =>
    p.$mobile ? `1px solid ${p.theme.colors.divider}` : 'none'};
  border-radius: ${(p) => (p.$mobile ? '0.65rem 0.65rem 0 0' : '0')};
  padding: ${(p) => (p.$mobile ? '0.75rem' : '0.5rem')};
`
