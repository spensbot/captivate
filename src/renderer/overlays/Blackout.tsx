import styled from 'styled-components'
import { useTypedSelector } from '../redux/store'

export default function Blackout() {
  const isOn = useTypedSelector((state) => state.gui.blackout)

  if (!isOn) return null

  return (
    <BRoot>
      <BText>
        <BTitle>Blackout</BTitle>
        <BSub>Click the button in the lower left corner to disable</BSub>
      </BText>
    </BRoot>
  )
}

const BRoot = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0005;
`

const BText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #0008;
`
const BTitle = styled.div`
  font-size: 15vh;
`
const BSub = styled.div`
  color: #aaa;
`
