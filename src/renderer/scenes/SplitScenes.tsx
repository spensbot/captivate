import ParamsControl from 'renderer/controls/ParamsControl'
import {
  useActiveLightScene,
  useControlSelector,
  useDmxSelector,
  useTypedSelector,
} from 'renderer/redux/store'
import {
  hideMoversSplitUi,
  hideVisSplitUi,
} from './splitUiVisibility'
import { universeHasMovers } from 'shared/dmxFixtures'
import { indexArray } from 'shared/util'
import styled from 'styled-components'
import GroupSelection from './GroupSelection'
import AddIcon from '@mui/icons-material/Add'
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

  return (
    <Root>
      <Title>Splits</Title>
      <SplitList>
        {splitSceneCount < 1 ? (
          <EmptyState>No splits yet. Add a split to start mapping groups and params.</EmptyState>
        ) : (
          indexes.map((index) => <SplitScene key={activeScene + index} index={index} />)
        )}
      </SplitList>
      <AddSplitFooter>
        <AddSplitDivider />
        <AddSplitButton type="button" onClick={onAddSplitScene} title="Add split">
          <AddIcon fontSize="small" />
          <span>Add Split</span>
        </AddSplitButton>
      </AddSplitFooter>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
`

const Title = styled.div`
  font-size: ${(props) => props.theme.font.size.h1};
  color: ${(props) => props.theme.colors.text.primary};
`

const SplitList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.18rem;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: #7a7a7a99 #0000;

  &::-webkit-scrollbar {
    display: block !important;
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #0000;
  }

  &::-webkit-scrollbar-thumb {
    background: #7a7a7a99;
    border-radius: 999px;
  }
`

const AddSplitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  padding: 0.26rem 0.5rem;
  font-size: 0.76rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 120ms ease, border-color 120ms ease;
  align-self: flex-start;

  &:hover {
    background: ${(props) => props.theme.colors.bg.lighter};
    border-color: ${(props) => props.theme.colors.text.secondary};
  }

  &:active {
    transform: translateY(1px);
  }
`

const AddSplitFooter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  min-width: 0;
`

const AddSplitDivider = styled.div`
  width: 100%;
  height: 1px;
  background: ${(props) => props.theme.colors.divider};
  opacity: 0.85;
`

const EmptyState = styled.div`
  border: 1px dashed ${(props) => props.theme.colors.divider};
  border-radius: 0.35rem;
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: 0.78rem;
  padding: 0.7rem 0.75rem;
`

interface Props {
  index: number
}

function SplitScene({ index }: Props) {
  const videoEnabled = useTypedSelector((state) => state.gui.videoEnabled)
  const hasMoverFixtures = useDmxSelector((dmx) =>
    universeHasMovers(dmx.universe, dmx.fixtureTypesByID)
  )
  const groups = useActiveLightScene(
    (scene) => scene.splitScenes[index]?.groups
  )
  if (hideVisSplitUi(videoEnabled, groups)) {
    return null
  }
  if (hideMoversSplitUi(hasMoverFixtures, groups)) {
    return null
  }
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
