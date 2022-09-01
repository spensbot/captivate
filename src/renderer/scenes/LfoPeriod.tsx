import { useDispatch } from 'react-redux'
import { useActiveLightScene } from '../redux/store'
import { setPeriod } from '../redux/controlSlice'
import DraggableNumber from '../base/DraggableNumber'

type Props = {
  index: number
}

export default function LfoPeriod({ index }: Props) {
  const mod = useActiveLightScene(
    (activeScene) => activeScene.modulators[index].mod
  )
  const dispatch = useDispatch()

  if (mod.type === 'Freq' || mod.type === 'Pitch' || mod.type === 'RMS')
    return null

  const period = mod.period

  function onChange(newVal: number) {
    dispatch(setPeriod({ index: index, newVal: newVal }))
  }

  return (
    <DraggableNumber
      value={period}
      min={0.25}
      max={32}
      onChange={onChange}
      style={{}}
    />
  )
}
