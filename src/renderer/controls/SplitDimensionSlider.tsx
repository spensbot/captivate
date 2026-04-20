import { useDispatch } from 'react-redux'
import { setBaseParams } from '../redux/controlSlice'
import { useBaseParam } from '../redux/store'
import styled from 'styled-components'
import SliderBase from '../base/SliderBase'
import LiveSliderCursor from './LiveSliderCursor'
import ManualSliderCursor from './ManualSliderCursor'

type SplitDimParam = 'width' | 'height' | 'depth'

interface Props {
  param: SplitDimParam
  splitIndex: number
  label: string
  title: string
}

const RADIUS = 0.4

export default function SplitDimensionSlider({
  param,
  splitIndex,
  label,
  title,
}: Props) {
  const dispatch = useDispatch()
  const value = useBaseParam(param, splitIndex)
  if (value === undefined) return null

  const onChange = (newVal: number) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          [param]: Math.max(0, Math.min(1, newVal)),
        },
      })
    )
  }

  return (
    <VerticalControl>
      <VerticalLabel title={title}>{label}</VerticalLabel>
      <VerticalSliderShell>
        <SliderBase
          orientation="vertical"
          radius={RADIUS}
          verticalPadRem={0.1}
          onChange={onChange}
          title={title}
          ariaLabel={title}
        >
          <LiveSliderCursor
            orientation="vertical"
            param={param}
            radius={RADIUS}
            splitIndex={splitIndex}
            color="#7fb7ff99"
          />
          <ManualSliderCursor
            orientation="vertical"
            param={param}
            splitIndex={splitIndex}
            value={value}
            radius={RADIUS}
            color="#fff"
            border
          />
        </SliderBase>
      </VerticalSliderShell>
    </VerticalControl>
  )
}

const VerticalControl = styled.div`
  width: 1.7rem;
  min-width: 1.7rem;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0.18rem;
`

const VerticalLabel = styled.div`
  align-self: center;
  flex-shrink: 0;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  text-orientation: mixed;
  font-size: 0.56rem;
  font-weight: 700;
  color: #d7dff0;
  letter-spacing: 0.01rem;
  user-select: none;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

const VerticalSliderShell = styled.div`
  position: relative;
  width: 0.92rem;
  min-height: 0;
  flex: 1 1 auto;
  align-self: stretch;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`
