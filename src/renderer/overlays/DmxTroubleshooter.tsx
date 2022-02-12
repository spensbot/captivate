import styled from 'styled-components'
import { useControlSelector, useTypedSelector } from '../redux/store'
import { setConnectionsMenu } from '../redux/guiSlice'
import { useDispatch } from 'react-redux'
import {} from '../redux/deviceState'
import CloseIcon from '@mui/icons-material/Close'
import IconButton from '@mui/material/IconButton'

interface Props {}

export default function DmxTroubleshooter({}: Props) {
  const dispatch = useDispatch()

  const connectable = useControlSelector((state) => state.device.connectTo)
  const dmx = useTypedSelector((state) => state.gui.dmx)
  const midi = useTypedSelector((state) => state.gui.midi)

  return (
    <Root>
      <Modal>
        <Row>
          <Title>Connections</Title>
          <IconButton onClick={() => dispatch(setConnectionsMenu(false))}>
            <CloseIcon />
          </IconButton>
        </Row>
        <Row>
          <Pane style={{ borderRight: '1px solid #777' }}>
            <Title>Dmx</Title>
            {connectable.dmx}
            {dmx.available}
            {dmx.connected}
          </Pane>
          <Pane>
            <Title>Midi</Title>
            {connectable.midi}
            {midi.available}
            {midi.connected}
          </Pane>
        </Row>
      </Modal>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  background-color: #0007;
`

const Modal = styled.div`
  background-color: ${(props) => props.theme.colors.bg.primary};
  margin: 5rem;
`

const Row = styled.div`
  display: flex;
  padding: 1rem;
  align-items: center;
  justify-content: space-between;
`

const Pane = styled.div`
  flex: '1 0 auto';
  padding: 1rem;
`

const Title = styled.div`
  font-size: 1.5rem;
`
