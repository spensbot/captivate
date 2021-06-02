import React from 'react'
import styled from 'styled-components'
import { getActionID, MidiAction, listen, addAction, stopListening } from '../../redux/midiSlice'
import { useTypedSelector } from '../../redux/store'
import { useDispatch } from 'react-redux'

interface Props {
  children: React.ReactNode
  action: MidiAction
}

export default function MidiOverlay({ children, action }: Props) {
  const isEditing = useTypedSelector(state => state.midi.isEditing)
  const controlledAction = useTypedSelector(
    state => { return state.midi.byActionID[getActionID(action)] || null }
  )
  const isListening = useTypedSelector(state => {
    if (!state.midi.listening) return false
    return getActionID(state.midi.listening) === getActionID(action)
  })
  const dispatch = useDispatch()

  const onClick = () => {
    dispatch(listen(action))
  }

  return (
    <Root>
      {children}
      { isEditing &&
        <Overlay selected={isListening} onClick={onClick}>
          {controlledAction?.inputID}
        </Overlay>
      }
    </Root>
  )
}

const Root = styled.div`
  position: relative;
`

const Overlay = styled.div<{selected: boolean}>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  cursor: pointer;
  border: ${props => props.selected && '1px solid white'};
  background: #56fd56b7;
  display: flex;
  justify-content: center;
  align-items: center;
  color: black;
`