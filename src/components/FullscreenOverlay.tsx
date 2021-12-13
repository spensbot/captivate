import React from 'react'
import styled from 'styled-components'
import { useTypedSelector } from '../redux/store'
import zIndexes from '../util/zIndexes'

interface Props {

}

export default function FullscreenOverlay({ }: Props) {
  const blackout = useTypedSelector(state => state.gui.blackout)

  return (
    // null
    <Root onClick={e => {}}>
      {blackout && <Blackout />}
    </Root>
  )
}

const Root = styled.div`
  z-index: ${zIndexes.fullscreenOverlay};
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
`

function Blackout() {
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
