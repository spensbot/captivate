import styled from 'styled-components'
import React from 'react'

interface Props {
  isEnabled: boolean
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
  title?: string
}

function childrenText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return children.toString()
  if (Array.isArray(children)) {
    return children.map((item) => childrenText(item)).join(' ').trim()
  }
  return ''
}

export default function ToggleButton(props: Props) {
  const inferredTitle = props.title ?? childrenText(props.children) ?? 'Toggle'
  return (
    <Root
      type="button"
      enabled={props.isEnabled}
      onClick={props.onClick}
      title={inferredTitle}
      aria-label={inferredTitle}
    >
      {props.children}
    </Root>
  )
}

const Root = styled.button<{ enabled: boolean }>`
  background-color: ${(props) => (props.enabled ? '#afaa' : '#fff2')};
  color: ${(props) => (props.enabled ? '#fff' : '#fff8')};
  border: none;
  border-radius: 0.3rem;
  padding: 0rem 0.2rem;
  margin-right: 0.5rem;
  cursor: pointer;
`
