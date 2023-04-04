import { useDispatch } from 'react-redux'
import { useActiveLightScene, useControlSelector } from '../../../../renderer/redux/store'
import { setPeriod } from '../../../../renderer/redux/controlSlice'
import DraggableNumber from '../../../../renderer/base/DraggableNumber'
import { RangeMidiOverlay } from 'features/midi/react/MidiOverlay'

// const Notes = {
//   '1/4': 0.25,
//   '1/2': 0.5,
//   '1': 1,
//   '2': 2,
//   '4': 2,
//   '8': 2,
// } as const

type Props = {
  index: number
}

export default function LfoPeriod({ index }: Props) {
  const period = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].lfo.period
  )
  const sceneId = useControlSelector((state) => state.light.active)

  const dispatch = useDispatch()

  function onChange(newVal: number) {
    dispatch(setPeriod({ index: index, newVal: newVal }))
  }

  const wrapperStyle: React.CSSProperties = {}

  const min = 0.25
  const max = 32

  return (
    <>
      <RangeMidiOverlay
        action={{ type: 'setPeriod', index, sceneId }}
        style={wrapperStyle}
        min={min}
        max={max}
      >
        <DraggableNumber
          value={period}
          min={min}
          max={max}
          onChange={onChange}
          style={{}}
        />
      </RangeMidiOverlay>
    </>
  )
}
