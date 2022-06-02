import styled from 'styled-components'
import { Param, Params } from 'shared/params'
import { useDispatch } from 'react-redux'
import { setBaseParams } from 'renderer/redux/controlSlice'

interface Props {
  splitIndex: number | null
  params: readonly Param[]
}

export default function ParamXButton({ splitIndex, params }: Props) {
  const dispatch = useDispatch()

  const onClick = () => {
    const deletedParams: Partial<Params> = {}
    for (const param of params) {
      deletedParams[param] = undefined
    }
    dispatch(
      setBaseParams({
        splitIndex,
        params: deletedParams,
      })
    )
  }

  return (
    <Root onClick={onClick} onMouseDown={(e) => e.preventDefault()}>
      X
    </Root>
  )
}

const Root = styled.div`
  position: absolute;
  background-color: #0006;
  cursor: pointer;
  color: ${(props) => props.theme.colors.text.secondary};
  :hover {
    color: ${(props) => props.theme.colors.text.primary};
  }
  padding: 0.4rem;
  top: 0;
  right: 0;
`
