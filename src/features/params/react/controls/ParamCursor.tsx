import { useOutputParam } from 'features/params/redux'
import { DefaultParam } from '../../shared/params'
import SliderCursor from '../../../ui/react/base/SliderCursor'

interface Props<Param extends string = DefaultParam> {
  param: Param
  radius: number
  orientation: 'vertical' | 'horizontal'
  splitIndex: number
}

export default function ParamCursor<Param extends string = DefaultParam>({
  param,
  radius,
  orientation,
  splitIndex,
}: Props<Param>) {
  const value = useOutputParam(param, splitIndex)

  return (
    <SliderCursor value={value} radius={radius} orientation={orientation} />
  )
}
