import styled from 'styled-components'
import zIndexes from '../zIndexes'

export type AppModalTone = 'default' | 'danger'

export interface AppModalAction {
  label: string
  onClick: () => void
  tone?: AppModalTone
}

interface Props {
  open: boolean
  title: string
  message?: string
  children?: React.ReactNode
  actions: AppModalAction[]
  onClose?: () => void
  maxWidth?: string
  /** When set, gives the dialog a taller footprint (e.g. editor modals). */
  minHeight?: string
  maxHeight?: string
}

export default function AppModal({
  open,
  title,
  message,
  children,
  actions,
  onClose,
  maxWidth,
  minHeight,
  maxHeight,
}: Props) {
  if (!open) {
    return null
  }

  return (
    <Root
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && onClose !== undefined) {
          onClose()
        }
      }}
    >
      <Card
        $maxWidth={maxWidth}
        $minHeight={minHeight}
        $maxHeight={maxHeight}
      >
        <Title>{title}</Title>
        {message !== undefined && message.length > 0 && <Message>{message}</Message>}
        {children}
        <Actions>
          {actions.map((action, index) => (
            <ActionButton
              key={`${action.label}-${index}`}
              type="button"
              $tone={action.tone ?? 'default'}
              onClick={action.onClick}
            >
              {action.label}
            </ActionButton>
          ))}
        </Actions>
      </Card>
    </Root>
  )
}

const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${zIndexes.fullscreenOverlay + 2};
  background: #0008;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
`

const Card = styled.div<{
  $maxWidth?: string
  $minHeight?: string
  $maxHeight?: string
}>`
  width: ${(props) =>
    `min(${props.$maxWidth ?? '34rem'}, calc(100vw - 2rem))`};
  min-height: ${(props) => props.$minHeight ?? 'auto'};
  max-height: ${(props) => props.$maxHeight ?? 'calc(100vh - 2rem)'};
  overflow: auto;
  border: 1px solid #ffffff2d;
  border-radius: 0.5rem;
  background: ${(props) => props.theme.colors.bg.primary};
  box-shadow: 0 0.6rem 2.1rem #0008;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
`

const Title = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.primary};
`

const Message = styled.div`
  font-size: 0.86rem;
  color: ${(props) => props.theme.colors.text.secondary};
  white-space: pre-wrap;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.2rem;
`

const ActionButton = styled.button<{ $tone: AppModalTone }>`
  min-width: 6.6rem;
  border-radius: 0.35rem;
  border: 1px solid
    ${(props) => (props.$tone === 'danger' ? '#d16c6c' : '#ffffff42')};
  background: ${(props) => (props.$tone === 'danger' ? '#7a2020' : '#0007')};
  color: #e9efff;
  padding: 0.35rem 0.65rem;
  cursor: pointer;
  font-size: 0.8rem;
`
