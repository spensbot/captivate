import React from 'react'
import styled from 'styled-components'

interface Props {
  value: string
  onChange: (newVal: string) => void
}

export default function Input({ value, onChange }: Props) {
  return <Root value={value} onChange={e => onChange(e.target.value)}/>
}

const Root = styled.input`
  border: none;
  color: #fff;
  background-color: #fff1;
  width: 100%;
  font-size: 1rem;
`