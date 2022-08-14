import { useDispatch } from 'react-redux'
import { useTypedSelector } from 'renderer/redux/store'
import { setBlackout } from '../redux/guiSlice'
import styled from 'styled-components'
import zIndexes from '../zIndexes'
import Blackout from './Blackout'
import Devices from './Devices'
import NewProjectDialog from './NewProjectDialog'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'

interface Props {}

export default function FullscreenOverlay({}: Props) {
  const isBlackout = useTypedSelector((state) => state.gui.blackout)
  const connectionsMenu = useTypedSelector((state) => state.gui.connectionMenu)
  const newProjectDialog = useTypedSelector(
    (state) => state.gui.newProjectDialog
  )
  const isPlaying = useRealtimeSelector((rtState) => rtState.time.isPlaying)
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

  if (!isPlaying)
    return (
      <Root style={{ pointerEvents: 'none' }}>
        <Warning>
          <WarningText>
            Stopped
            <SubText>Press the Play Button to Continue</SubText>
          </WarningText>
        </Warning>
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

const Warning = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0006;
`

const WarningText = styled.div`
  padding: 3rem;
  font-size: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  background-color: #0006;
  /* width: 100%; */
`
const SubText = styled.div`
  font-size: 1.5rem;
  text-align: center;
  color: ${(props) => props.theme.colors.text.secondary};
`
