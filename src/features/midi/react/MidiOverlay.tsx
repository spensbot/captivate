import styled from 'styled-components'
import * as Popover from '@radix-ui/react-popover'
import { getActionID, SliderAction } from '../../../renderer/redux/deviceState'
import {
  midiListen,
  midiStopListening,
  midiSetSliderAction,
  removeMidiAction,
} from '../../../renderer/redux/controlSlice'
import { useDeviceSelector } from '../../../renderer/redux/store'
import { useDispatch } from 'react-redux'
import DraggableNumber from '../../../renderer/base/DraggableNumber'
import Button from '../../../renderer/base/Button'
import './midi-overlay-styles.css'
import { useEffect, useRef } from 'react'
import { MidiAction } from '../redux'
interface Props {
  children?: React.ReactNode
  action: MidiAction
  style?: React.CSSProperties
}

export function ButtonMidiOverlay({ children, action, style }: Props) {
  const isEditing = useDeviceSelector((state) => state.isEditing)
  const controlledAction = useDeviceSelector((state) => {
    return state.buttonActions[getActionID(action)] || null
  })
  const isListening = useDeviceSelector((state) => {
    if (!state.listening) return false
    return getActionID(state.listening) === getActionID(action)
  })
  const dispatch = useDispatch()

  const onClick = () => {
    dispatch(midiListen(action))
  }

  return (
    <Root style={style}>
      {children}
      {isEditing && (
        <Overlay selected={isListening} onClick={onClick}>
          {controlledAction && (
            <>
              {controlledAction.inputID}
              <X action={action} />
            </>
          )}
        </Overlay>
      )}
    </Root>
  )
}

export function SliderMidiOverlay({ children, action, style }: Props) {
  const isEditing = useDeviceSelector((state) => state.isEditing)
  const controlledAction = useDeviceSelector((state) => {
    return state.sliderActions[getActionID(action)] || null
  })
  const isListening = useDeviceSelector((state) => {
    if (!state.listening) return false
    return getActionID(state.listening) === getActionID(action)
  })
  const dispatch = useDispatch()

  const onClick = () => {
    dispatch(midiListen(action))
  }

  const onChangeMin = (newVal: number) => {
    dispatch(
      midiSetSliderAction({
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
      midiSetSliderAction({
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
      midiSetSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          mode: controlledAction.options.mode === 'hold' ? 'toggle' : 'hold',
        },
      })
    )
  }

  const onClickMode_cc = () => {
    dispatch(
      midiSetSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          mode:
            controlledAction.options.mode === 'relative'
              ? 'absolute'
              : 'relative',
        },
      })
    )
  }

  const onClickValue = (value: 'max' | 'velocity') => () => {
    dispatch(
      midiSetSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          value: value === 'max' ? 'velocity' : 'max',
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
                <X action={action} />
                <MinMax>
                  <DraggableNumber
                    type="continuous"
                    style={minMaxStyle}
                    value={controlledAction.options.min}
                    min={0}
                    max={controlledAction.options.max}
                    onChange={onChangeMin}
                    noArrows
                  />
                  <DraggableNumber
                    type="continuous"
                    style={minMaxStyle}
                    value={controlledAction.options.max}
                    min={controlledAction.options.min}
                    max={1}
                    onChange={onChangeMax}
                    noArrows
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
                      onClick={onClickValue(controlledAction.options.value)}
                    />
                  </>
                )}
                {controlledAction.options.type === 'cc' && (
                  <Button
                    fontSize="0.8rem"
                    label={controlledAction.options.mode}
                    onClick={onClickMode_cc}
                  />
                )}
              </>
            )}
          </Wrapper>
        </Overlay>
      )}
    </Root>
  )
}

interface RangeProps extends Props {
  min?: number
  max?: number
}

export function RangeMidiOverlay({
  children,
  action,
  style,
  min,
  max,
}: RangeProps) {
  const isEditing = useDeviceSelector((state) => state.isEditing)
  const controlledAction = useDeviceSelector((state) => {
    return state.sliderActions[getActionID(action)] || null
  })
  const controlledRef = useRef<SliderAction>()

  const isListening = useDeviceSelector((state) => {
    if (!state.listening) return false
    return getActionID(state.listening) === getActionID(action)
  })
  const dispatch = useDispatch()

  const onListen = () => {
    dispatch(midiListen(action))
  }
  const onStopListen = () => {
    dispatch(midiStopListening())
  }

  const onSelect = (open: boolean) => {
    if (open) {
      if (!controlledAction) onListen()
    } else {
      onStopListen()
    }
  }

  const onChangeMin = (newVal: number) => {
    dispatch(
      midiSetSliderAction({
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
      midiSetSliderAction({
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
      midiSetSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          mode: controlledAction.options.mode === 'hold' ? 'toggle' : 'hold',
        },
      })
    )
  }

  const onClickMode_cc = () => {
    dispatch(
      midiSetSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          mode:
            controlledAction.options.mode === 'relative'
              ? 'absolute'
              : 'relative',
        },
      })
    )
  }

  const onClickValue = (value: 'max' | 'velocity') => () => {
    dispatch(
      midiSetSliderAction({
        ...controlledAction,
        options: {
          ...controlledAction.options,
          value: value === 'max' ? 'velocity' : 'max',
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

  const getState = (): keyof typeof StateColor | undefined => {
    if (isListening) return 'listening'
    if (controlledAction) return 'controlled'
    return undefined
  }

  useEffect(() => {
    if (isListening && controlledRef.current !== controlledAction) {
      onStopListen()
    }
    controlledRef.current = controlledAction
  }, [isListening, controlledAction])

  return (
    <Root style={style}>
      {children}
      {isEditing && (
        <Popover.Root onOpenChange={onSelect}>
          <TriggerOverlay
            state={getState()}
            className="PopoverTrigger"
          ></TriggerOverlay>

          <Popover.Portal>
            {controlledAction && (
              <Popover.Content className="PopoverContent">
                <>
                  <button onClick={onListen}>listen</button>
                  {controlledAction.inputID}
                  <Popover.Close
                    onClick={() => dispatch(removeMidiAction(action))}
                  >
                    X
                  </Popover.Close>
                  <MinMax>
                    <DraggableNumber
                      type="continuous"
                      style={minMaxStyle}
                      value={controlledAction.options.min}
                      min={min || 0}
                      max={controlledAction.options.max}
                      onChange={onChangeMin}
                      noArrows
                    />
                    <DraggableNumber
                      type="continuous"
                      style={minMaxStyle}
                      value={controlledAction.options.max}
                      min={controlledAction.options.min}
                      max={max || 1}
                      onChange={onChangeMax}
                      noArrows
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
                        onClick={onClickValue(controlledAction.options.value)}
                      />
                    </>
                  )}
                  {controlledAction.options.type === 'cc' && (
                    <Button
                      fontSize="0.8rem"
                      label={controlledAction.options.mode}
                      onClick={onClickMode_cc}
                    />
                  )}
                </>
                <Popover.Arrow className="PopoverArrow" />
              </Popover.Content>
            )}
          </Popover.Portal>
        </Popover.Root>
      )}
    </Root>
  )
}

const Root = styled.div`
  position: relative;
`

const StateColor = {
  listening: '2px solid white',
  controlled: '2px solid green',
  undefined: '0',
} as const

const TriggerOverlay = styled(Popover.Trigger)<{
  state: keyof typeof StateColor | undefined
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  cursor: pointer;
  ${(props) => {
    return `border: ${StateColor[props.state ? props.state : 'undefined']};`
  }}
  background: #56fd56b7;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  color: black;
`

const Overlay = styled.div<{ selected: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  cursor: pointer;
  border: ${(props) => props.selected && '2px solid white'};
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

function X({ action }: { action: MidiAction }) {
  const dispatch = useDispatch()
  const onClick = () => dispatch(removeMidiAction(action))
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', marginLeft: '0.5rem' }}>
      X
    </div>
  )
}
