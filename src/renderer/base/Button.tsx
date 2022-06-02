import styled from 'styled-components'

type Props = {
  label: string
  fontSize?: string
  onClick?: () => void
}

export default function Button({ label, fontSize = '0.9rem', onClick }: Props) {
  return (
    <Root onClick={onClick} style={{ fontSize: fontSize }}>
      {label}
    </Root>
  )
}

const Root = styled.div`
  background-color: #222;
  color: #fff;
  border: 1px solid #888;
  border-radius: 3px;
  padding: 0.1rem 0.2rem;
`
