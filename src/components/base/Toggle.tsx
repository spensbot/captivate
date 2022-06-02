import React from 'react'
import styled from 'styled-components'

interface Props {
  isOn: boolean
  onChange: (newState: boolean) => void
}

export default function Toggle({ isOn, onChange }: Props) {
  return (
    <Root onClick={() => onChange(!isOn)}>
      {isOn && <Fill />}
    </Root>
  )
}

const Root = styled.div`
  cursor: pointer;
  padding: 0.1rem;
  width: 1rem;
  height: 1rem;
  background-color: #0003;
`

const Fill = styled.div`
  width: 100%;
  height: 100%;
  background-color: #fff3
`