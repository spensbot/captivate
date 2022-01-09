import styled from 'styled-components'
import {
  getActionID,
  MidiAction,
  listen,
  setButtonAction,
  setSliderAction,
} from '../redux/midiSlice'
import { useTypedSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import DraggableNumber from './DraggableNumber'
import Button from './Button'

interface Props {
  children?: React.ReactNode
  action: MidiAction
  style?: React.CSSProperties
}

export function ButtonMidiOverlay({ children, action, style }: Props) {
  const isEditing = useTypedSelector((state) => state.midi.isEditing)
  const controlledAction = useTypedSelector((state) => {
    return state.midi.buttonActions[getActionID(action)] || null
  })
  const isListening = useTypedSelector((state) => {
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
      {isEditing && (
        <Overlay selected={isListening} onClick={onClick}>
          {controlledAction?.inputID}
        </Overlay>
      )}
    </Root>
  )
}

export function SliderMidiOverlay({ children, action, style }: Props) {
  const isEditing = useTypedSelector((state) => state.midi.isEditing)
  const controlledAction = useTypedSelector((state) => {
    return state.midi.sliderActions[getActionID(action)] || null
  })
  const isListening = useTypedSelector((state) => {
    if (!state.midi.listening) return false
    return getActionID(state.midi.listening) === getActionID(action)
  })
  const dispatch = useDispatch()

  const onClick = () => {
    dispatch(listen(action))
  }

  const onChangeMin = (newVal: number) => {
    dispatch(
      setSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          min: newVal,
        },
      })
    )
  }

  const onChangeMax = (newVal: number) => {
    dispatch(
      setSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          max: newVal,
        },
      })
    )
  }

  const onClickMode = () => {
    dispatch(
      setSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          mode: controlledAction.options.mode === 'hold' ? 'toggle' : 'hold',
        },
      })
    )
  }

  const onClickValue = () => {
    dispatch(
      setSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          value: controlledAction.options.value === 'max' ? 'velocity' : 'max',
        },
      })
    )
  }

  const minMaxStyle: React.CSSProperties = {
    padding: '0.1rem 0.2rem',
    margin: '0.2rem',
    color: 'white',
    backgroundColor: '#0009',
  }

  return (
    <Root style={style}>
      {children}
      {isEditing && (
        <Overlay selected={isListening} onClick={onClick}>
          <Wrapper>
            {controlledAction && (
              <>
                {controlledAction.inputID}
                <MinMax>
                  <DraggableNumber
                    type="continuous"
                    style={minMaxStyle}
                    value={controlledAction.options.min}
                    min={0}
                    max={controlledAction.options.max}
                    onChange={onChangeMin}
                  />
                  <DraggableNumber
                    type="continuous"
                    style={minMaxStyle}
                    value={controlledAction.options.max}
                    min={controlledAction.options.min}
                    max={1}
                    onChange={onChangeMax}
                  />
                </MinMax>
                {controlledAction.options.type === 'note' && (
                  <>
                    <Button
                      fontSize="0.8rem"
                      label={controlledAction.options.mode}
                      onClick={onClickMode}
                    />
                    <Button
                      fontSize="0.8rem"
                      label={controlledAction.options.value}
                      onClick={onClickValue}
                    />
                  </>
                )}
              </>
            )}
          </Wrapper>
        </Overlay>
      )}
    </Root>
  )
}

const Root = styled.div`
  position: relative;
`

const Overlay = styled.div<{ selected: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  cursor: pointer;
  border: ${(props) => props.selected && '1px solid white'};
  background: #56fd56b7;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  color: black;
`

const Wrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  background-color: #56fd56b7;
`

const MinMax = styled.div`
  display: flex;
  flex-wrap: wrap-reverse;
  font-size: 0.75rem;
  justify-content: center;
`
