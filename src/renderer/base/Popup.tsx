import styled from 'styled-components'
import Button from '@mui/material/Button'

interface Props {
  title: string
  style?: React.CSSProperties
  children: React.ReactNode
  onClose: () => void
}

export default function Popup({ style, title, onClose, children }: Props) {
  return (
    <Root style={style}>
      <Title>
        {title}
        <Button onClick={onClose}>X</Button>
      </Title>
      {children}
    </Root>
  )
}

const Root = styled.div`
  position: absolute;
  width: fit-content;
  height: fit-content;
  padding: 1rem;
`

const Title = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`
