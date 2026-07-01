import styled from 'styled-components'
import zIndexes, { type AppModalStack } from '../zIndexes'
import OverlayPortal from './OverlayPortal'

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
  /**
   * Fixed width/height from viewport (content scrolls inside; card does not
   * resize with children).
   */
  fillViewport?: boolean
  width?: string
  height?: string
  /**
   * `nestedModal` when this dialog opens on top of a wizard or another AppModal
   * (e.g. WYSIWYG emitter editor inside the model wizard).
   */
  stack?: AppModalStack
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
  fillViewport = false,
  width,
  height,
  stack = 'appModal',
}: Props) {
  if (!open) {
    return null
  }

  return (
    <OverlayPortal>
      <Root
        $stack={stack}
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
        $fillViewport={fillViewport}
        $width={width}
        $height={height}
      >
        <Title>{title}</Title>
        {message !== undefined && message.length > 0 && <Message>{message}</Message>}
        {children !== undefined && children !== null && <Body>{children}</Body>}
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
    </OverlayPortal>
  )
}

const Root = styled.div<{ $stack: AppModalStack }>`
  position: fixed;
  inset: 0;
  z-index: ${(p) => zIndexes.overlay[p.$stack]};
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
  $fillViewport?: boolean
  $width?: string
  $height?: string
}>`
  width: ${(props) =>
    props.$fillViewport && props.$width !== undefined
      ? props.$width
      : `min(${props.$maxWidth ?? '34rem'}, calc(100vw - 2rem))`};
  height: ${(props) =>
    props.$fillViewport && props.$height !== undefined ? props.$height : 'auto'};
  min-height: ${(props) =>
    props.$fillViewport && props.$height !== undefined
      ? props.$height
      : props.$minHeight ?? 'auto'};
  max-height: ${(props) => props.$maxHeight ?? 'calc(100dvh - 2rem)'};
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.5rem;
  background: ${(props) => props.theme.colors.bg.primary};
  box-shadow: 0 0.6rem 2.1rem #0008;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  box-sizing: border-box;
`

const Body = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
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
  flex-shrink: 0;
`

const ActionButton = styled.button<{ $tone: AppModalTone }>`
  min-width: 6.6rem;
  border-radius: 0.35rem;
  border: 1px solid
    ${(props) =>
      props.$tone === 'danger'
        ? '#d16c6c'
        : props.theme.colors.divider};
  background: ${(props) =>
    props.$tone === 'danger'
      ? '#7a2020'
      : props.theme.colors.bg.panel};
  color: ${(props) =>
    props.$tone === 'danger' ? '#ffeaea' : props.theme.colors.text.primary};
  padding: 0.35rem 0.65rem;
  cursor: pointer;
  font-size: 0.8rem;
`
