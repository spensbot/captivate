import { useTypedSelector } from '../redux/store'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { setIsEditing } from '../redux/midiSlice'

interface Props {
  type: 'midi' | 'dmx'
}

export default function ConnectionStatus({ type }: Props) {
  const connection = useTypedSelector((state) => state.connections[type])
  const isEditing = useTypedSelector((state) => state.midi.isEditing)
  const dispatch = useDispatch()

  const color = connection.isConnected ? '#0f0' : '#f00'

  const onClick =
    type === 'dmx' ? () => {} : () => dispatch(setIsEditing(!isEditing))

  return (
    <Root>
      <Text>{type}</Text>
      <Button style={{ backgroundColor: color }} onClick={onClick}></Button>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  padding: 0rem 0.2rem;
  font-size: 0.8rem;
`

const Text = styled.span`
  color: #fff7;
`

const Button = styled.div`
  width: 0.6rem;
  height: 0.6rem;
  cursor: pointer;
  margin-left: 0.5rem;
`
