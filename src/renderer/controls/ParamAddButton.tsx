import styled from 'styled-components'
import { Param, Params } from 'shared/params'
import { useDispatch } from 'react-redux'
import { setBaseParams } from 'renderer/redux/controlSlice'
import { defaultOutputParams } from 'shared/params'

interface Props {
  splitIndex: number | null
  title: string
  params: readonly Param[]
}

const defalt = defaultOutputParams()

export default function ParamAddButton({ title, splitIndex, params }: Props) {
  const dispatch = useDispatch()

  const onClick = () => {
    const newParams: Partial<Params> = {}
    for (const param of params) {
      newParams[param] = defalt[param]
    }
    dispatch(
      setBaseParams({
        splitIndex,
        params: newParams,
      })
    )
  }

  return <Root onClick={onClick}>{title}</Root>
}

const Root = styled.div`
  background-color: ${(props) => props.theme.colors.bg.lighter};
  cursor: pointer;
  color: ${(props) => props.theme.colors.text.secondary};
  :hover {
    color: ${(props) => props.theme.colors.text.primary};
  }
  writing-mode: vertical-rl;
  padding: 1rem;
  align-self: stretch;
`
