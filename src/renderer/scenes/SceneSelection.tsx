import { sortScenesByBombacity, autoBombacity } from '../redux/controlSlice'
import { SceneType } from '../../shared/Scenes'
import { IconButton, Tooltip } from '@mui/material'
import styled from 'styled-components'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SortIcon from '@mui/icons-material/Sort'
import AutoScene from './AutoScene'
import ScenesList from './ScenesList'
import { useDispatch } from 'react-redux'
import VisualSceneTransitionControls from './VisualSceneTransitionControls'
import { useControlSelector } from '../redux/store'
import { LightScenesHelpButton, VisualScenesHelpButton } from './sceneHelpButtons'

export default function SceneSelection({
  sceneType,
  flattenScroll = false,
}: {
  sceneType: SceneType
  flattenScroll?: boolean
}) {
  const dispatch = useDispatch()
  const sceneCount = useControlSelector((state) => state[sceneType].ids.length)
  const canReweightScenes = sceneCount > 1

  return (
    <Root $flatten={flattenScroll}>
      <Header>
        <TitleCluster>
          {`${sceneType === 'light' ? 'Light' : 'Visual'} Scenes`}
          {sceneType === 'light' ? (
            <LightScenesHelpButton />
          ) : (
            <VisualScenesHelpButton />
          )}
        </TitleCluster>
        <Sp />
        {sceneType === 'light' && (
          <>
            {' '}
            <Tooltip
              title={
                canReweightScenes
                  ? 'Sort scenes from calm to intense'
                  : 'Need at least two scenes'
              }
            >
              <span>
                <IconButton
                  aria-label="Sort scenes by energy level"
                  disabled={!canReweightScenes}
                  onClick={() => dispatch(sortScenesByBombacity(sceneType))}
                >
                  <SortIcon style={{ transform: 'scaleY(-1)' }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                canReweightScenes
                  ? 'Spread energy colors evenly across scenes'
                  : 'Need at least two scenes'
              }
            >
              <span>
                <IconButton
                  aria-label="Auto-distribute scene energy"
                  disabled={!canReweightScenes}
                  onClick={() => dispatch(autoBombacity(sceneType))}
                >
                  <AutoAwesomeIcon />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
      </Header>
      <Sp2 />
      <AutoScene sceneType={sceneType} />
      {sceneType === 'visual' && (
        <>
          <Sp2 />
          <VisualSceneTransitionControls />
        </>
      )}
      <Sp2 />
      <ScenesList sceneType={sceneType} flattenScroll={flattenScroll} />
    </Root>
  )
}

const Root = styled.div<{ $flatten?: boolean }>`
  background-color: ${(props) => props.theme.colors.bg.darker};
  padding: ${(p) => (p.$flatten ? '0' : '1rem 1rem 0 1rem')};
  height: ${(p) => (p.$flatten ? 'auto' : '100%')};
  flex: ${(p) => (p.$flatten ? '0 0 auto' : undefined)};
  border-right: ${(p) =>
    p.$flatten ? 'none' : `1px solid ${p.theme.colors.divider}`};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-top: -0.3rem;
  min-height: 2.5rem;
`

const TitleCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: ${(props) => props.theme.font.size.h1};
`

const Sp = styled.div`
  flex: 1 0 0;
`

const Sp2 = styled.div`
  min-height: 0.5rem;
`
