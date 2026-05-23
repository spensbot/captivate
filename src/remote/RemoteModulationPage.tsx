import React from 'react'
import SplitPane from '../renderer/base/SplitPane'
import SceneSelection from '../renderer/scenes/SceneSelection'
import Modulators from '../renderer/scenes/Modulators'
import SplitScenes from '../renderer/scenes/SplitScenes'
import styled from 'styled-components'
import { useRemoteUiMode } from './RemoteUiModeContext'
import { REMOTE_MOBILE_MODULATION_VARS } from './remoteMobileModulationTokens'

export default function RemoteModulationPage() {
  const { isMobile } = useRemoteUiMode()

  const splitPaneStyle: React.CSSProperties = {
    flex: '1 1 0',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  }

  if (isMobile) {
    return (
      <Root>
        <MobileBody data-remote-mobile-modulation>
          <MobileSection>
            <MobileSectionTitle>Scenes</MobileSectionTitle>
            <SceneSelection sceneType="light" />
          </MobileSection>
          <MobileSection>
            <MobileSectionTitle>Modulation</MobileSectionTitle>
            <ModulatorsHost>
              <Modulators />
            </ModulatorsHost>
          </MobileSection>
          <MobileSection>
            <MobileSectionTitle>Splits</MobileSectionTitle>
            <SplitScenesHost>
              <SplitScenes />
            </SplitScenesHost>
          </MobileSection>
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.65rem;
  min-width: 0;
  min-height: 0;
  flex: 1 1 0;
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

const MobileBody = styled.div`
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 0.5rem 0.65rem 1rem;

  &[data-remote-mobile-modulation] {
    --remote-mod-graph-w: ${REMOTE_MOBILE_MODULATION_VARS.graphW};
    --remote-mod-graph-h: ${REMOTE_MOBILE_MODULATION_VARS.graphH};
    --remote-mod-panel-h: ${REMOTE_MOBILE_MODULATION_VARS.panelH};
    --remote-mod-side-rail-w: ${REMOTE_MOBILE_MODULATION_VARS.sideRailW};
    --remote-mod-vertical-control-w: ${REMOTE_MOBILE_MODULATION_VARS.verticalControlW};
    --remote-mod-vertical-slider-w: ${REMOTE_MOBILE_MODULATION_VARS.verticalSliderW};
    --remote-mod-vertical-label-font: ${REMOTE_MOBILE_MODULATION_VARS.verticalLabelFont};
    --remote-mod-strip-min-h: ${REMOTE_MOBILE_MODULATION_VARS.stripMinH};
    --remote-mod-strip-font: ${REMOTE_MOBILE_MODULATION_VARS.stripFont};
    --remote-mod-strip-pad-y: ${REMOTE_MOBILE_MODULATION_VARS.stripPadY};
    --remote-mod-matrix-bar-min-h: ${REMOTE_MOBILE_MODULATION_VARS.matrixBarMinH};
    --remote-mod-card-gap: ${REMOTE_MOBILE_MODULATION_VARS.cardGap};
    --remote-mod-add-icon-size: ${REMOTE_MOBILE_MODULATION_VARS.addIconSize};
    --remote-mod-chevron: ${REMOTE_MOBILE_MODULATION_VARS.chevronSize};
    --remote-mod-top-gap: ${REMOTE_MOBILE_MODULATION_VARS.topGap};
    --remote-mod-top-pad-x: 0.45rem;
    --remote-mod-matrix-pad-x: ${REMOTE_MOBILE_MODULATION_VARS.matrixPadX};
  }
`

const MobileSection = styled.section`
  & + & {
    margin-top: 1.25rem;
  }
`

const MobileSectionTitle = styled.h2`
  margin: 0 0 0.65rem;
  font-size: 1rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.primary};
`

const SplitScenesHost = styled.div`
  min-height: 14rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
