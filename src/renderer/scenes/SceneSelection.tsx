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

export default function SceneSelection({
  sceneType,
}: {
  sceneType: SceneType
}) {
  const dispatch = useDispatch()
  const sceneCount = useControlSelector((state) => state[sceneType].ids.length)
  const canReweightScenes = sceneCount > 1

  return (
    <Root>
      <Header>
        {`${sceneType === 'light' ? 'Light' : 'Visual'} Scenes`}
        <Sp />
        {sceneType === 'light' && (
          <>
            {' '}
            <Tooltip
              title={
                canReweightScenes
                  ? 'Sort scenes by energy level'
                  : 'Add at least 2 scenes to sort'
              }
            >
              <span>
                <IconButton
                  title="Sort scenes by energy level"
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
                  ? 'Distribute scene energy from low to high automatically'
                  : 'Add at least 2 scenes to auto-distribute energy'
              }
            >
              <span>
                <IconButton
                  title="Auto-distribute scene energy"
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
      <ScenesList sceneType={sceneType} />
    </Root>
  )
}

const Root = styled.div`
  background-color: ${(props) => props.theme.colors.bg.darker};
  padding: 1rem 1rem 0 1rem;
  height: 100%;
  border-right: 1px solid ${(props) => props.theme.colors.divider};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-top: -0.3rem;
  font-size: ${(props) => props.theme.font.size.h1};
  min-height: 2.5rem;
`

const Sp = styled.div`
  flex: 1 0 0;
`

const Sp2 = styled.div`
  min-height: 0.5rem;
`
