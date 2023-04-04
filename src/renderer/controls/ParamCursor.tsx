import { useOutputParam } from '../redux/realtimeStore'
import { DefaultParam } from '../../shared/params'
import SliderCursor from '../../features/ui/react/base/SliderCursor'

interface Props {
  param: DefaultParam | string
  radius: number
  orientation: 'vertical' | 'horizontal'
  splitIndex: number
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
