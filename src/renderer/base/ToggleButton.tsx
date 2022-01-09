import React from 'react'
import styled from 'styled-components'

interface Props {
  isEnabled: boolean
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
}

export default function ToggleButton(props: Props) {
  return (
    <Root enabled={props.isEnabled} onClick={props.onClick}>
      {props.children}
    </Root>
  )
}

const Root = styled.div<{ enabled: boolean }>`
  background-color: ${(props) => (props.enabled ? '#afaa' : '#fff2')};
  color: ${(props) => (props.enabled ? '#fff' : '#fff8')};
  border-radius: 0.3rem;
  padding: 0rem 0.2rem;
  margin-right: 0.5rem;
`
