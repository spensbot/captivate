import styled, { css, keyframes } from 'styled-components'
import * as Popover from '@radix-ui/react-popover'
import { SliderAction } from '../redux'
import {
  midiListen,
  midiStopListening,
  midiSetSliderAction,
  removeMidiAction,
} from '../../../renderer/redux/controlSlice'
import { useDeviceSelector } from '../../../renderer/redux/store'
import { useDispatch } from 'react-redux'
import DraggableNumber from '../../ui/react/base/DraggableNumber'
import Button, { StyledButton } from '../../ui/react/base/Button'
import { useEffect, useRef } from 'react'
import { getActionID } from '../redux'
import { MidiActions } from '../shared/actions'
interface Props {
  children?: React.ReactNode
  action: MidiActions
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
              <PopoverContent className="PopoverContent">
                <>
                  <p
                    style={{
                      position: 'absolute',
                      left: '0.4rem',
                      top: '0.3rem',
                    }}
                  >
                    {controlledAction.inputID}
                  </p>

                  <PopoverContainer>
                    {controlledAction.options.type === 'note' && (
                      <>
                        <Button
                          label={controlledAction.options.mode}
                          onClick={onClickMode}
                        />
                        <Button
                          label={controlledAction.options.value}
                          onClick={onClickValue(controlledAction.options.value)}
                        />
                      </>
                    )}

                    {controlledAction.options.type === 'cc' && (
                      <Button
                        label={controlledAction.options.mode}
                        onClick={onClickMode_cc}
                      />
                    )}
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

                    <StyledButton onClick={onListen}>Midi Listen</StyledButton>
                    <StyledButton
                      style={{ color: '#c63737', borderColor: '#c63737' }}
                      as={Popover.Close}
                      onClick={() => dispatch(removeMidiAction(action))}
                    >
                      Remove
                    </StyledButton>
                  </PopoverContainer>
                </>
                <PopoverArrow className="PopoverArrow" />
              </PopoverContent>
            )}
          </Popover.Portal>
        </Popover.Root>
      )}
    </Root>
  )
}

const PopoverContainer = styled.div`
  display: flex;
  flex-direction: column;
  > * + *:not(style) {
    margin-top: 6px;
  }
`

const PopoverContent = styled(Popover.Content)`
  border-radius: 4px;
  padding: 25px 15px 15px 15px;
  width: 90px;
  border: 1px solid ${(props) => props.theme.colors.divider};
  background-color: ${(props) => props.theme.colors.bg.primary};
`
const PopoverArrow = styled(Popover.Arrow)`
  fill: ${(props) => props.theme.colors.bg.primary};
`

const Root = styled.div`
  position: relative;
`

const breatheAnimation = keyframes`
 0% { border: 2px solid rgba(255,255,255,0); }
 40% { border: 2px solid rgba(255,255,255,1); }
 100% { border: 2px solid rgba(255,255,255,0); }
`

const StateColor = {
  listening: css`
    animation-name: ${breatheAnimation};
    animation-duration: 1s;
    animation-iteration-count: infinite;
  `,
  controlled: css`
    border: 2px solid white;
  `,
  undefined: css`
    border: 0;
  `,
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
    return StateColor[props.state ? props.state : 'undefined']
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

function X({ action }: { action: MidiActions }) {
  const dispatch = useDispatch()
  const onClick = () => dispatch(removeMidiAction(action))
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', marginLeft: '0.5rem' }}>
      X
    </div>
  )
}
