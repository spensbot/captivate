import styled from 'styled-components'
import { DefaultParam } from 'features/dmx/shared/params'
import { useDispatch } from 'react-redux'
import { deleteBaseParams } from 'renderer/redux/controlSlice'

interface Props {
  splitIndex: number
  params: readonly (DefaultParam | string)[]
}

export default function ParamXButton({ splitIndex, params }: Props) {
  const dispatch = useDispatch()

  const onClick = () => {
    dispatch(
      deleteBaseParams({
        splitIndex,
        params,
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
