import React from 'react'
import styled from 'styled-components'
import { getActionID, MidiAction, listen,  setButtonAction, setSliderAction } from '../../redux/midiSlice'
import { useTypedSelector } from '../../redux/store'
import { useDispatch } from 'react-redux'
import DraggableNumber from './DraggableNumber'

interface Props {
  children: React.ReactNode
  action: MidiAction
  style?: React.CSSProperties
}

export function ButtonMidiOverlay({ children, action, style }: Props) {
  const isEditing = useTypedSelector(state => state.midi.isEditing)
  const controlledAction = useTypedSelector(
    state => { return state.midi.buttonActions[getActionID(action)] || null }
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
    <Root style={style}>
      {children}
      { isEditing &&
        <Overlay selected={isListening} onClick={onClick}>
          {controlledAction?.inputID}
        </Overlay>
      }
    </Root>
  )
}

export function SliderMidiOverlay({ children, action, style }: Props) {
  const isEditing = useTypedSelector(state => state.midi.isEditing)
  const controlledAction = useTypedSelector(
    state => { return state.midi.sliderActions[getActionID(action)] || null }
  )
  const isListening = useTypedSelector(state => {
    if (!state.midi.listening) return false
    return getActionID(state.midi.listening) === getActionID(action)
  })
  const dispatch = useDispatch()

  const onClick = () => {
    dispatch(listen(action))
  }

  const onChangeMin = (newVal: number) => {
    dispatch(setSliderAction({
      ...controlledAction,
      options: {
        ...controlledAction.options,
        min: newVal
      }
    }))
  }

  const onChangeMax = (newVal: number) => {
    dispatch(setSliderAction({
      ...controlledAction,
      options: {
        ...controlledAction.options,
        max: newVal
      }
    }))
  }

  return (
    <Root style={style}>
      {children}
      { isEditing &&
        <Overlay selected={isListening} onClick={onClick}>
          {controlledAction && <>
            {controlledAction.inputID}
            <DraggableNumber value={controlledAction.options.max} min={controlledAction.options.min} max={1} onChange={onChangeMax}/>
            <DraggableNumber value={controlledAction.options.min} min={0} max={controlledAction.options.max} onChange={onChangeMin} />
            {controlledAction.options.type === 'note' && <div>{controlledAction.options.behavior}</div>}
          </>}
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
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  color: black;
`