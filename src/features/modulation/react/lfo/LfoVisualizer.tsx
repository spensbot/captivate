import { GetValueFromPhase } from '../../shared/oscillator'
import { useDispatch } from 'react-redux'
import useDragBasic from '../../../ui/react/hooks/useDragBasic'
import { incrementModulator } from '../../../../renderer/redux/controlSlice'
import { useActiveLightScene } from '../../../../renderer/redux/store'
import { secondaryEnabled } from 'features/ui/react/base/keyUtil'

type Props = {
  index: number
  width: number
  height: number
  padding: number
}

const stepSize = 2
const lineWidth = 2
const backgroundColor = '#000000'
const lineColor = '#3333ff'

export default function LfoVisualizer({
  index,
  width,
  height,
  padding,
}: Props) {
  const xPadding = width * padding
  const yPadding = height * padding
  const width_ = width - xPadding * 2
  const height_ = height - yPadding * 2

  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = -e.movementX / width
    const dy = e.movementY / height
    const se = secondaryEnabled(e)
    dispatch(
      incrementModulator({
        index: index,
        phaseShift: se ? 0 : dx,
        flip: se ? 0 : dy,
        symmetricSkew: se ? dx : 0,
        skew: se ? dy : 0,
      })
    )
  })

  const modulator = useActiveLightScene(
    (activeScene) => activeScene.modulators[index]
  )

  function GetPoints() {
    const zeros = Array(width_ / stepSize + 1).fill(0)

    const pointsArray = zeros.map((_, i) => {
      const x = (i * stepSize) / width_
      const y = 1 - GetValueFromPhase(modulator.lfo, x)
      return [x * width_ + xPadding, y * height_ + yPadding]
    })

    const points = pointsArray.reduce((accum, point) => {
      return accum + `${point[0]},${point[1]}` + ' '
    }, '')

    return points
  }

  return (
    <div
      ref={dragContainer}
      onMouseDown={onMouseDown}
      style={{
        width: width,
        height: height,
        backgroundColor: backgroundColor,
        position: 'relative',
      }}
    >
      <svg height={height} width={width}>
        <polyline
          points={GetPoints()}
          style={{ fill: 'none', stroke: lineColor, strokeWidth: lineWidth }}
        />
      </svg>
    </div>
  )
}
