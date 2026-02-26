import ParamsControl from 'renderer/controls/ParamsControl'
import { useActiveLightScene, useControlSelector } from 'renderer/redux/store'
import { indexArray } from 'shared/util'
import styled from 'styled-components'
import GroupSelection from './GroupSelection'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import IconButton from '@mui/material/IconButton'
import { useDispatch } from 'react-redux'
import { addSplitScene } from 'renderer/redux/controlSlice'

export default function SplitScenes() {
  const dispatch = useDispatch()
  const activeScene = useControlSelector((scenes) => scenes.light.active)
  const splitSceneCount = useActiveLightScene(
    (scene) => scene.splitScenes.length
  )

  const indexes = indexArray(splitSceneCount)

  const onAddSplitScene = () => dispatch(addSplitScene())

  if (splitSceneCount < 1) {
    return (
      <Root>
        <Button onClick={onAddSplitScene}>Split</Button>
      </Root>
    )
  }

  return (
    <Root>
      {indexes.map((index) => (
        <SplitScene key={activeScene + index} index={index} />
      ))}
      <IconButton onClick={onAddSplitScene} title="Add split">
        <AddIcon />
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
`

interface Props {
  index: number
}

function SplitScene({ index }: Props) {
  return (
    <Root2>
      <GroupSelection splitIndex={index} />
      <SplitControls>
        <ParamsControl splitIndex={index} />
      </SplitControls>
    </Root2>
  )
}

const Root2 = styled.div`
  border-top: 1px solid ${(props) => props.theme.colors.divider};
  margin-bottom: 1rem;
  background-color: ${(props) => props.theme.colors.bg.darker};
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  padding-bottom: 0.35rem;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    height: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const SplitControls = styled.div`
  width: max-content;
  min-width: 100%;
`
