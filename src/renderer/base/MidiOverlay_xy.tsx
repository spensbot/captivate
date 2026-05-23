import styled from 'styled-components'
import {
  getActionID,
  makeSetBaseParamAction,
  type MidiAction,
} from '../redux/deviceState'
import { paramDisplayName } from '../../shared/params'
import { useDeviceSelector } from '../redux/store'
import { SliderMidiOverlay } from './MidiOverlay'

interface XYProps {
  children: React.ReactNode
  actions: MidiAction[]
  /** Per-zone labels; defaults from param names when actions are setBaseParam. */
  labels?: string[]
  splitIndex?: number
  style?: React.CSSProperties
}

function defaultAxisLabel(action: MidiAction): string {
  if (action.type === 'setBaseParam') {
    const key = action.paramKey
    const short: Record<string, string> = {
      x: 'X',
      y: 'Y',
      xAxis: 'Pan',
      yAxis: 'Tilt',
      saturation: 'S',
      brightness: 'V',
      z: 'Z',
    }
    return short[key] ?? paramDisplayName(key)
  }
  return ''
}

function resolveLabels(actions: MidiAction[], labels?: string[]): string[] {
  return actions.map((action, index) => {
    const explicit = labels?.[index]?.trim()
    if (explicit) return explicit
    const fallback = defaultAxisLabel(action)
    return fallback.length > 0 ? fallback : `Axis ${index + 1}`
  })
}

export default function MidiOverlay_xy({
  children,
  actions,
  labels,
  splitIndex = 0,
  style,
}: XYProps) {
  const isEditing = useDeviceSelector((state) => state.isEditing)
  const zoneLabels = resolveLabels(actions, labels)
  const overlayStyle: React.CSSProperties = { width: '100%', height: '100%' }
  const splitBadge =
    splitIndex > 0 ? (
      <SplitBadge title={`Split ${splitIndex + 1} MIDI zones`}>
        S{splitIndex + 1}
      </SplitBadge>
    ) : null

  const actionsWithSplit = actions.map((action) => {
    if (action.type === 'setBaseParam' && action.splitIndex === undefined) {
      return makeSetBaseParamAction(splitIndex, action.paramKey)
    }
    return action
  })

  return (
    <Root style={style}>
      {children}
      {isEditing && actionsWithSplit.length === 2 && (
        <Overlay>
          {splitBadge}
          <AxisZone $position="top">
            <AxisLabel>{zoneLabels[1]}</AxisLabel>
            <SliderMidiOverlay
              action={actionsWithSplit[1]}
              style={overlayStyle}
            />
          </AxisZone>
          <AxisZone $position="bottom">
            <AxisLabel>{zoneLabels[0]}</AxisLabel>
            <SliderMidiOverlay
              action={actionsWithSplit[0]}
              style={overlayStyle}
            />
          </AxisZone>
        </Overlay>
      )}
      {isEditing && actionsWithSplit.length !== 2 && (
        <Overlay $wrap>
          {splitBadge}
          {actionsWithSplit.map((action, index) => (
            <FlexZone key={getActionID(action)}>
              <AxisLabel>{zoneLabels[index]}</AxisLabel>
              <SliderMidiOverlay action={action} style={overlayStyle} />
            </FlexZone>
          ))}
        </Overlay>
      )}
    </Root>
  )
}

const Root = styled.div`
  position: relative;
`

const Overlay = styled.div<{ $wrap?: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: ${(props) => (props.$wrap ? 'row' : 'column')};
  flex-wrap: ${(props) => (props.$wrap ? 'wrap' : 'nowrap')};
  align-items: stretch;
  pointer-events: none;
  & > * {
    pointer-events: auto;
  }
`

const AxisZone = styled.div<{ $position: 'top' | 'bottom' }>`
  position: relative;
  flex: 1 1 50%;
  min-height: 0;
  border-bottom: ${(props) =>
    props.$position === 'top' ? '2px dashed #ffffff88' : 'none'};
`

const FlexZone = styled.div`
  position: relative;
  flex: 1 1 40%;
  min-width: 40%;
  min-height: 40%;
  border: 1px dashed #ffffff55;
  box-sizing: border-box;
`

const AxisLabel = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  pointer-events: none;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #0a1a0acc;
  text-shadow:
    0 0 0.35rem #e8ffe8,
    0 0 0.15rem #fff;
  user-select: none;
`

const SplitBadge = styled.div`
  position: absolute;
  top: 0.2rem;
  right: 0.25rem;
  z-index: 3;
  pointer-events: none;
  font-size: 0.58rem;
  font-weight: 700;
  padding: 0.1rem 0.28rem;
  border-radius: 0.2rem;
  background: #000c;
  color: #d7ffe0;
  border: 1px solid #ffffff44;
  letter-spacing: 0.03em;
`
