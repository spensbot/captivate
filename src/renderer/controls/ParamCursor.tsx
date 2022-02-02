import { useRealtimeSelector } from '../redux/realtimeStore'
import { Param } from '../../shared/params'
import SliderCursor from '../base/SliderCursor'

interface Props {
  param: Param
  radius: number
  orientation: 'vertical' | 'horizontal'
}

export default function ParamCursor({ param, radius, orientation }: Props) {
  const value = useRealtimeSelector((state) => state.outputParams[param])

  return (
    <SliderCursor value={value} radius={radius} orientation={orientation} />
  )
}
