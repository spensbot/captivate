import styled from 'styled-components'
import zIndexes from '../zIndexes'
import wrapClick from './wrapClick'

export interface ModalButton {
  text: string
  onClick: () => void
}

interface Props {
  title?: string
  message?: string
  buttons?: ModalButton[]
  children: React.ReactNode
  modalStyle?: React.CSSProperties
}

export default function FullscreenModal({
  title,
  message,
  buttons,
  children,
  modalStyle,
}: Props) {
  return (
    <Root onClick={wrapClick(() => {})}>
      <Modal style={modalStyle}>
        {title && <Title>{title}</Title>}
        {message && <Message>{message}</Message>}
        {children}
      </Modal>
    </Root>
  )
}

const Root = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #000a;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: ${zIndexes.fullscreenOverlay};
`

const Modal = styled.div`
  background-color: ${(props) => props.theme.colors.background.primary};
  box-shadow: ${(props) => props.theme.shadow(5)};
  padding: ${(props) => props.theme.spacing(5)};
  & > * {
    margin-bottom: ${(props) => props.theme.spacing(1)};
  }
`

const Title = styled.div`
  font-size: 2rem;
  white-space: pre-line;
`

const Message = styled.div`
  white-space: pre-line;
`
