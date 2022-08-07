import { DownIcon, UpIcon } from 'renderer/icons/arrows'
import { clamp } from 'math/util'
import useDragBasic from '../hooks/useDragBasic'
import styled from 'styled-components'
import { double_incremented, halve_incremented } from 'shared/util'
import React from 'react'
import { secondaryEnabled } from './keyUtil'

type Type = 'continuous' | 'snap'

interface Props {
  type?: Type
  secondaryBehavior?: Type
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
let globalMovement = 0
let globalValue = 0

export default function DraggableNumber({
  type = 'snap',
  secondaryBehavior = 'continuous',
  value,
  min,
  max,
  onChange,
  style,
  suffix,
  noArrows,
}: Props) {
  const speedAdjust = 500 / (max - min)

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = e.movementX
    const dy = -e.movementY
    const d = (dx + dy) / speedAdjust

    const adjust_continuous = () => {
      globalValue += d / 2
    }
    const adjust_snap = () => {
      if (Number.isInteger(globalValue)) {
        globalMovement += d
        if (globalMovement > 1) {
          globalValue += 1
          globalMovement = 0
        } else if (globalMovement < -1) {
          globalValue -= 1
          globalMovement = 0
        }
      } else {
        // We are somewhere between integers.
        //   "Snap" to the next integer
        const floor = Math.floor(globalValue)
        const ceil = Math.ceil(globalValue)
        globalValue += d
        if (globalValue > ceil) {
          globalValue = ceil
        } else if (globalValue < floor) {
          globalValue = floor
        }
      }
    }

    if (secondaryEnabled(e)) {
      if (secondaryBehavior === 'snap') {
        adjust_snap()
      } else {
        adjust_continuous()
      }
    } else {
      if (type === 'snap') {
        adjust_snap()
      } else {
        adjust_continuous()
      }
    }

    globalValue = clamp(globalValue, min, max)

    onChange(globalValue)
  })

  function onMouseDownWrapper(e: React.MouseEvent<HTMLDivElement>) {
    globalMovement = 0
    globalValue = value
    onMouseDown(e)
  }

  let valueString =
    type === 'snap' && Number.isInteger(value)
      ? value.toString()
      : value.toFixed(2)

  if (suffix) valueString += suffix

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
