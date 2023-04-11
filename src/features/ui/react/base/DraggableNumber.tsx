import { DownIcon, UpIcon } from 'features/ui/react/icons/arrows'
import { clamp } from 'features/utils/math/util'
import useDragBasic from '../hooks/useDragBasic'
import styled from 'styled-components'
import { double_incremented, halve_incremented } from 'features/utils/util'
import React, { MutableRefObject } from 'react'
import { secondaryEnabled } from './keyUtil'

type Type = 'continuous' | 'snap'

interface Props {
  adjustments?: { primary?: Type; secondary?: Type }
  value: number
  min: number
  max: number
  onChange: (newVal: number) => void
  style?: React.CSSProperties
  suffix?: string
  noArrows?: boolean
}

// This is really bad react behavior... But IDK what else to do
// This only works if you can't drag more than 1 thing at a time
let globalMovementRef = { current: 0 }
let globalValueRef = { current: 0 }

const useDraggableNumber = ({
  onChange,
  min,
  value,
  valueRef,
  movementRef,
  max,
  adjustments: adjustmentsConfig,
}: Pick<Props, 'onChange' | 'min' | 'max' | 'value'> & {
  valueRef: MutableRefObject<number>
  movementRef: MutableRefObject<number>
  adjustments: { primary: Type; secondary: Type }
}) => {
  const speedAdjust = 500 / (max - min)
  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = e.movementX
    const dy = -e.movementY
    const d = (dx + dy) / speedAdjust

    const adjustments = {
      continuous: () => {
        valueRef.current += d / 2
      },
      snap: () => {
        if (Number.isInteger(valueRef.current)) {
          movementRef.current += d
          if (movementRef.current > 1) {
            valueRef.current += 1
            movementRef.current = 0
          } else if (movementRef.current < -1) {
            valueRef.current -= 1
            movementRef.current = 0
          }
        } else {
          // We are somewhere between integers.
          //   "Snap" to the next integer
          const floor = Math.floor(valueRef.current)
          const ceil = Math.ceil(valueRef.current)
          valueRef.current += d
          if (valueRef.current > ceil) {
            valueRef.current = ceil
          } else if (valueRef.current < floor) {
            valueRef.current = floor
          }
        }
      },
    } as const

    // use when control key pressed
    if (secondaryEnabled(e)) {
      adjustments[adjustmentsConfig.secondary]()
    } else {
      adjustments[adjustmentsConfig.primary]()
    }

    valueRef.current = clamp(valueRef.current, min, max)

    onChange(valueRef.current)
  })

  function onMouseDownWrapper(e: React.MouseEvent<HTMLDivElement>) {
    movementRef.current = 0
    valueRef.current = value
    onMouseDown(e)
  }

  return {
    dragContainer,
    onMouseDownWrapper,
  }
}

// type AdjustmentsConfig = {
//   ToString: Partial<{
//     [k in Type]: (v: number) => string
//   }>
// }

export default function DraggableNumber({
  adjustments: adjustmentsConfig = { primary: 'snap', secondary: 'continuous' },

  value,
  min,
  max,
  onChange,
  style,
  suffix,
  noArrows,
}: Props) {
  const adjustments = Object.assign(
    { primary: 'snap', secondary: 'continuous' },
    adjustmentsConfig
  )
  const { dragContainer, onMouseDownWrapper } = useDraggableNumber({
    max,
    min,
    movementRef: globalMovementRef,
    onChange,
    value,
    valueRef: globalValueRef,
    adjustments,
  })

  const adjustmentsToString: Partial<{
    [k in Type]: (v: number) => string
  }> = {
    snap(v: number) {
      if (Number.isInteger(v)) return v.toString()
      return v.toFixed(2)
    },
  } as const

  const valueToString = (v: number) => {
    const toString = adjustmentsToString[adjustments.primary]

    let valueString = toString ? toString(v) : v.toFixed(2)

    if (suffix) valueString += suffix

    return valueString
  }

  const valueString = valueToString(value)

  const onUp = () => {
    const doubled = double_incremented(value)
    onChange(Math.min(doubled, max))
  }

  const onDown = () => {
    const halved = halve_incremented(value)
    onChange(Math.max(halved, min))
  }

  return (
    <Root style={style}>
      <DragArea ref={dragContainer} onMouseDown={onMouseDownWrapper}>
        {valueString}
      </DragArea>
      <Col>
        {!noArrows && (
          <>
            <Arrow style={{ paddingBottom: '0.2rem' }} onClick={onUp}>
              <UpIcon height={5} width={10} />
            </Arrow>
            <Arrow style={{ paddingTop: '0.2rem' }} onClick={onDown}>
              <DownIcon height={5} width={10} />
            </Arrow>
          </>
        )}
      </Col>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  background-color: #0005;
`
const DragArea = styled.div`
  padding: 0.5rem 0.3rem 0.5rem 0.7rem;
  cursor: move;
  flex: 1;
`
const Col = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`
const Arrow = styled.div`
  cursor: pointer;
  padding: 0.4rem;
  font-size: 0; // for some reason this is necessary to make the svg render correctly?
`
