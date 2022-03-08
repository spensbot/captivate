import { useOutputParam } from '../redux/realtimeStore'
import { Param } from '../../shared/params'
import SliderCursor from '../base/SliderCursor'

interface Props {
  param: Param
  radius: number
  orientation: 'vertical' | 'horizontal'
  splitIndex: number | null
}

export default function ParamCursor({
  param,
  radius,
  orientation,
  splitIndex,
}: Props) {
  const value = useOutputParam(param, splitIndex)

  return (
    <SliderCursor value={value} radius={radius} orientation={orientation} />
  )
}
