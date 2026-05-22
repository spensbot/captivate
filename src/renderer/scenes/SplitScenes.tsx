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
        <AddSplitFooter>
          <AddSplitDivider />
          <AddSplitButton type="button" onClick={onAddSplitScene} title="Add split">
            <AddIcon fontSize="small" />
            <span>Add Split</span>
          </AddSplitButton>
        </AddSplitFooter>
      </SplitList>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  min-height: 0;
  /* flex-basis 0 so this panel can shrink below the sum of its children; SplitList scrolls */
  flex: 1 1 0;
  overflow: hidden;
`

const Title = styled.div`
  flex-shrink: 0;
  font-size: ${(props) => props.theme.font.size.h1};
  color: ${(props) => props.theme.colors.text.primary};
`

const SplitList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
  min-height: 0;
  flex: 1 1 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.12rem;
  scrollbar-gutter: stable;
  scrollbar-width: auto;
  scrollbar-color: rgba(155, 162, 182, 0.88) rgba(0, 0, 0, 0.32);

  &::-webkit-scrollbar {
    width: 11px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    margin: 3px 0;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(150, 158, 180, 0.62);
    border-radius: 6px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(185, 192, 215, 0.78);
    border: 2px solid transparent;
    background-clip: padding-box;
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
  flex-shrink: 0;
  flex-grow: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  min-width: 0;
  margin-top: 0.55rem;
  padding-bottom: 0.35rem;
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
  margin-bottom: 0;
  background-color: ${(props) => props.theme.colors.bg.darker};
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  padding-bottom: 0.35rem;
  scrollbar-width: auto;
  scrollbar-color: rgba(155, 162, 182, 0.88) rgba(0, 0, 0, 0.32);

  &::-webkit-scrollbar {
    height: 11px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    margin: 0 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(150, 158, 180, 0.62);
    border-radius: 6px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(185, 192, 215, 0.78);
    border: 2px solid transparent;
    background-clip: padding-box;
  }
`

const SplitControls = styled.div`
  width: max-content;
  min-width: 100%;
`
