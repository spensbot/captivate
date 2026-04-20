import { useOutputParam } from '../redux/realtimeStore'
import { DefaultParam } from '../../shared/params'
import SliderCursor from '../base/SliderCursor'

interface Props {
  param: DefaultParam | string
  radius: number
  orientation: 'vertical' | 'horizontal'
  splitIndex: number
  color?: string
}

export default function LiveSliderCursor({
  param,
  radius,
  orientation,
  splitIndex,
  color,
}: Props) {
  const value = useOutputParam(param, splitIndex)

  return (
    <SliderCursor value={value} radius={radius} orientation={orientation} color={color} />
  )
}
