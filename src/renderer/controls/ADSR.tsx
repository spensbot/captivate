import styled from 'styled-components'
import DraggableNumber from '../base/DraggableNumber'
import { lerp } from '../../shared/util'
import useDragMapped from '../hooks/useDragMapped'

export interface Control {
  val: number
  min: number
  max: number
  onChange: (newVal: number) => void
}

interface Props {
  width: number // px
  height: number // px
  ratio: Control
  duration: Control
}

const stepSize = 2
const lineWidth = 2
const backgroundColor = '#000000'
const lineColor = '#3333ff'
const padding = 0.05

const padding_string = `${padding * 100}%`

export default function ADSR({ width, height, ratio, duration }: Props) {
  const [dragContainer, onMouseDown] = useDragMapped((mappedPos) => {
    ratio.onChange(mappedPos.x)
  })

  const xPadding = width * padding
  const yPadding = height * padding
  const width_ = width - xPadding * 2
  const height_ = height - yPadding * 2

  const left = `${(ratio.val * (1 - padding * 2) + padding) * 100}%`

  function GetPoints() {
    const zeros = Array(width_ / stepSize + 1).fill(0)

    const pointsArray = zeros.map((_, i) => {
      const x = (i * stepSize) / width_
      let y =
        x < ratio.val
          ? lerp(0, 1, x / ratio.val)
          : lerp(0, 1, (1 - x) / (1 - ratio.val))
      y = 1 - y
      return [x * width_ + xPadding, y * height_ + yPadding]
    })

    const points = pointsArray
      .map((point) => `${point[0]},${point[1]}`)
      .join(' ')

    return points
  }

  return (
    <Root style={{ width: `${width}`, height: `${height}` }}>
      <DragContainer ref={dragContainer} onMouseDown={onMouseDown}>
        <svg height={height} width={width}>
          <polyline
            points={GetPoints()}
            style={{ fill: 'none', stroke: lineColor, strokeWidth: lineWidth }}
          />
        </svg>
      </DragContainer>
      <Handle style={{ left: left }} />
      <DraggableNumber
        style={{
          position: 'absolute',
          bottom: padding_string,
          right: padding_string,
        }}
        value={duration.val}
        min={duration.min}
        max={duration.max}
        onChange={duration.onChange}
      />
    </Root>
  )
}

const Root = styled.div`
  background-color: ${backgroundColor};
  position: relative;
`

const DragContainer = styled.div``

const Handle = styled.div`
  background-color: #fff;
  width: 1px;
  position: absolute;
  top: ${padding_string};
  bottom: ${padding_string};
`
