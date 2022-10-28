import { useDispatch } from 'react-redux'
import { useTypedSelector } from 'renderer/redux/store'
import { setBlackout } from '../redux/guiSlice'
import styled from 'styled-components'
import zIndexes from '../zIndexes'
import Blackout from './Blackout'
import Devices from './Devices'
import NewProjectDialog from './NewProjectDialog'
import LEDFxDialog from './LEDFxDialog'
import SceneSelect from './SceneSelect'

interface Props {}

export default function FullscreenOverlay({}: Props) {
  const isBlackout = useTypedSelector((state) => state.gui.blackout)
  const connectionsMenu = useTypedSelector((state) => state.gui.connectionMenu)
  const newProjectDialog = useTypedSelector(
    (state) => state.gui.newProjectDialog
  )
  const LedFxDialog = useTypedSelector((state) => state.gui.LEDFx)
  const sceneSelected = useTypedSelector((state) => state.gui.sceneSelect)
  const dispatch = useDispatch()

  if (isBlackout)
    return (
      <Root onClick={() => dispatch(setBlackout(!isBlackout))}>
        <Blackout />
      </Root>
    )

  if (connectionsMenu)
    return (
      <Root>
        <Devices />
      </Root>
    )

  if (newProjectDialog)
    return (
      <Root>
        <NewProjectDialog />
      </Root>
    )
  if (LedFxDialog)
    return (
      <Root>
        <LEDFxDialog />
      </Root>
    )
  if (sceneSelected)
    return (
      <Root>
        <SceneSelect />
      </Root>
    )

  return null
}

const Root = styled.div`
  z-index: ${zIndexes.fullscreenOverlay};
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`
