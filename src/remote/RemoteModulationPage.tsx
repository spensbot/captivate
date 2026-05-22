import React, { useState } from 'react'
import SplitPane from '../renderer/base/SplitPane'
import SceneSelection from '../renderer/scenes/SceneSelection'
import Modulators from '../renderer/scenes/Modulators'
import SplitScenes from '../renderer/scenes/SplitScenes'
import styled from 'styled-components'
import { useRemoteUiMode } from './RemoteUiModeContext'

type MobileSection = 'scenes' | 'modulation'

export default function RemoteModulationPage() {
  const { isMobile } = useRemoteUiMode()
  const [mobileSection, setMobileSection] = useState<MobileSection>('scenes')

  const splitPaneStyle: React.CSSProperties = {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  }

  if (isMobile) {
    return (
      <Root>
        <MobileSectionRow>
          <MobileSectionButton
            type="button"
            $active={mobileSection === 'scenes'}
            onClick={() => setMobileSection('scenes')}
          >
            Scenes
          </MobileSectionButton>
          <MobileSectionButton
            type="button"
            $active={mobileSection === 'modulation'}
            onClick={() => setMobileSection('modulation')}
          >
            Modulation &amp; splits
          </MobileSectionButton>
        </MobileSectionRow>
        <MobileBody>
          {mobileSection === 'scenes' ? (
            <MobilePane>
              <SceneSelection sceneType="light" />
            </MobilePane>
          ) : (
            <MobilePane>
              <Column>
                <ModulatorsHost>
                  <Modulators />
                </ModulatorsHost>
                <Sp />
                <SplitScenes />
              </Column>
            </MobilePane>
          )}
        </MobileBody>
      </Root>
    )
  }

  return (
    <Root>
      <SplitPane
        style={splitPaneStyle}
        type="vertical"
        initialSplit={0.28}
        rem={0.5}
        min={0.18}
        max={0.45}
      >
        <Pane>
          <SceneSelection sceneType="light" />
        </Pane>
        <Pane>
          <Column>
            <ModulatorsHost>
              <Modulators />
            </ModulatorsHost>
            <Sp />
            <SplitScenes />
          </Column>
        </Pane>
      </SplitPane>
    </Root>
  )
}

const Root = styled.div`
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Pane = styled.div`
  height: 100%;
  min-height: 0;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.65rem;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;

  [data-remote-ui-mode='mobile'] & {
    padding: 0.85rem;
  }
`

const ModulatorsHost = styled.div`
  flex-shrink: 0;
  min-width: 0;
  width: 100%;
`

const Sp = styled.div`
  flex-shrink: 0;
  height: 0.65rem;

  [data-remote-ui-mode='mobile'] & {
    height: 0.85rem;
  }
`

const MobileSectionRow = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem 0;
  flex-shrink: 0;
`

const MobileSectionButton = styled.button<{ $active: boolean }>`
  flex: 1;
  min-height: 3rem;
  border-radius: 0.45rem;
  border: 1px solid
    ${(p) => (p.$active ? p.theme.colors.text.primary : p.theme.colors.divider)};
  background: ${(p) =>
    p.$active ? p.theme.colors.bg.lighter : p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  font-size: 0.95rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  cursor: pointer;
  touch-action: manipulation;
`

const MobileBody = styled.div`
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
`

const MobilePane = styled.div`
  min-height: 100%;
  padding: 0.5rem 0.65rem 0.85rem;
`
