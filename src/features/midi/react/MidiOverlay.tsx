import styled, { css, keyframes } from 'styled-components'
import * as Popover from '@radix-ui/react-popover'
import { ButtonAction, SliderAction } from '../redux'
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
import { ReactNode, useEffect, useRef } from 'react'
import { getActionID } from '../redux'
import { MidiActions } from '../shared/actions'
interface Props {
  children?: React.ReactNode
  action: MidiActions
  style?: React.CSSProperties
}

const destructiveColor = '#c63737'

export function ButtonMidiOverlay({ children, action, style }: Props) {
  return (
    <MidiWrapper actionType="buttonActions" action={action} style={style}>
      {children}
    </MidiWrapper>
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
  const controlledAction = useDeviceSelector((state) => {
    return state.sliderActions[getActionID(action)] || null
  })

  const dispatch = useDispatch()

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
    <MidiWrapper
      actionType="sliderActions"
      action={action}
      style={style}
      controlSlot={
        controlledAction && (
          <>
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
                adjustments={{ primary: 'continuous' }}
                style={minMaxStyle}
                value={controlledAction.options.min}
                min={min || 0}
                max={controlledAction.options.max}
                onChange={onChangeMin}
                noArrows
              />
              <DraggableNumber
                adjustments={{ primary: 'continuous' }}
                style={minMaxStyle}
                value={controlledAction.options.max}
                min={controlledAction.options.min}
                max={max || 1}
                onChange={onChangeMax}
                noArrows
              />
            </MinMax>
          </>
        )
      }
    >
      {children}
    </MidiWrapper>
  )
}

function MidiWrapper({
  children,
  action,
  style,
  controlSlot,
  actionType,
}: Props & {
  controlSlot?: ReactNode
  actionType: 'sliderActions' | 'buttonActions'
}) {
  const isEditing = useDeviceSelector((state) => state.isEditing)
  const controlledAction = useDeviceSelector((state) => {
    return state[actionType][getActionID(action)] || null
  })
  const controlledRef = useRef<SliderAction | ButtonAction>()

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

  const onRemove = () => dispatch(removeMidiAction(action))

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
        <>
          <Popover.Root onOpenChange={onSelect}>
            <TriggerOverlay
              as={Popover.Trigger}
              state={getState()}
              className="PopoverTrigger"
            ></TriggerOverlay>
            {controlledAction && (
              <button
                onClick={onRemove}
                style={{
                  backgroundColor: 'white',
                  color: destructiveColor,
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '15px',
                  height: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                x
              </button>
            )}
            <Popover.Portal>
              <PopoverContent
                className="PopoverContent"
                style={controlledAction ? {} : { display: 'none' }}
              >
                {controlledAction && (
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
                      {controlSlot}
                      <StyledButton onClick={onListen}>
                        Midi Listen
                      </StyledButton>
                      <StyledButton
                        style={{
                          color: destructiveColor,
                          borderColor: destructiveColor,
                        }}
                        as={Popover.Close}
                        onClick={onRemove}
                      >
                        Remove
                      </StyledButton>
                    </PopoverContainer>
                  </>
                )}
                <PopoverArrow className="PopoverArrow" />
              </PopoverContent>
            </Popover.Portal>
          </Popover.Root>
        </>
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

const TriggerOverlay = styled.button<{
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

const MinMax = styled.div`
  display: flex;
  flex-wrap: wrap-reverse;
  font-size: 0.75rem;
  justify-content: center;
`
