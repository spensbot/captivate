import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../redux/controlSlice'
import XYAxisCursor from './XYAxisCursor'
import styled from 'styled-components'
import { useBaseParam } from 'renderer/redux/store'
import ParamXButton from './ParamXButton'
import ParamAddButton from './ParamAddButton'
import { Param } from 'shared/params'

const params: readonly Param[] = ['xAxis', 'yAxis', 'xMirror']

interface Props {
  splitIndex: number | null
}

export default function XYAxispad({ splitIndex }: Props) {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y }) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          xAxis: x,
          yAxis: y,
        },
      })
    )
  })

  const xAxis = useBaseParam('xAxis', splitIndex)
  const xMirror = useBaseParam('xMirror', splitIndex)
  const yAxis = useBaseParam('yAxis', splitIndex)

  if (xAxis === undefined || xMirror === undefined || yAxis === undefined) {
    return (
      <ParamAddButton
        title="X/Y Axis"
        splitIndex={splitIndex}
        params={params}
      />
    )
  }

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      <XYAxisCursor splitIndex={splitIndex} />
      <MirroredButton
        active={xMirror > 0.5}
        onClick={(e) => {
          e.preventDefault()
          dispatch(
            setBaseParams({
              splitIndex,
              params: { xMirror: xMirror > 0.5 ? 0 : 1 },
            })
          )
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        mirror
      </MirroredButton>
      <ParamXButton splitIndex={splitIndex} params={params} />
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  min-width: 200px;
  height: 180px;
  background: #000;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.colors.divider};
`

const MirroredButton = styled.div<{ active: boolean }>`
  position: absolute;
  cursor: pointer;
  top: 0rem;
  left: 0rem;
  padding: 0.4rem;
  background-color: #0009;
  color: ${(props) =>
    props.active
      ? props.theme.colors.text.primary
      : props.theme.colors.text.secondary};
  :hover {
    text-decoration: underline;
  }
`
