import React from 'react'
import styled from 'styled-components'

interface Props {
  children: React.ReactChildren
}

export default function MidiOverlay({ children }: Props) {
  return (
    <Root>
      {children}
      <Overlay>

      </Overlay>
    </Root>
  )
}

const Root = styled.div`
  position: relative;
`

const Overlay = styled.div<{selected: boolean}>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  cursor: pointer;
  border: ${props => props.selected && '1px solid white'}
`