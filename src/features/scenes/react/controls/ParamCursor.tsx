import { useOutputParam } from '../../../../renderer/redux/realtimeStore'
import { DefaultParam } from '../../../dmx/shared/params'
import SliderCursor from '../../../ui/react/base/SliderCursor'

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
