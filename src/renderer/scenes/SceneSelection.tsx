import { sortScenesByBombacity, autoBombacity } from '../redux/controlSlice'
import { SceneType } from '../../shared/Scenes'
import { IconButton } from '@mui/material'
import styled from 'styled-components'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SortIcon from '@mui/icons-material/Sort'
import AutoScene from './AutoScene'
import ScenesList from './ScenesList'
import { useDispatch } from 'react-redux'

export default function SceneSelection({
  sceneType,
}: {
  sceneType: SceneType
}) {
  const dispatch = useDispatch()

  return (
    <Root>
      <Header>
        {`${sceneType === 'light' ? 'Light' : 'Visual'} Scenes`}
        <Sp />
        {sceneType === 'light' && (
          <>
            {' '}
            <IconButton
              onClick={() => dispatch(sortScenesByBombacity(sceneType))}
            >
              <SortIcon style={{ transform: 'scaleY(-1)' }} />
            </IconButton>
            <IconButton onClick={() => dispatch(autoBombacity(sceneType))}>
              <AutoAwesomeIcon />
            </IconButton>
          </>
        )}
      </Header>
      <Sp2 />
      <AutoScene sceneType={sceneType} />
      <Sp2 />
      <ScenesList sceneType={sceneType} />
    </Root>
  )
}

const Root = styled.div`
  background-color: ${(props) => props.theme.colors.bg.darker};
  padding: 1rem;
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
  height: 2.5rem;
`

const Sp = styled.div`
  flex: 1 0 0;
`

const Sp2 = styled.div`
  min-height: 0.5rem;
`
