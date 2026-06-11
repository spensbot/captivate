import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import zIndexes from '../zIndexes'
import OverlayPortal from '../overlays/OverlayPortal'

interface Props {
  title: React.ReactNode
  children: React.ReactNode
  onClose: () => void
  cardWidth?: string
  cardMaxWidth?: string
  cardMaxHeight?: string
}

export default function Popup({
  title,
  onClose,
  children,
  cardWidth,
  cardMaxWidth,
  cardMaxHeight,
}: Props) {
  return (
    <OverlayPortal>
      <Root
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose()
          }
        }}
      >
      <Card
        $cardWidth={cardWidth}
        $cardMaxWidth={cardMaxWidth}
        $cardMaxHeight={cardMaxHeight}
      >
        <Title>
          {title}
          <IconButton
            onClick={(e) => {
              e.preventDefault()
              onClose()
            }}
          >
            <CloseIcon />
          </IconButton>
        </Title>
        {children}
      </Card>
      </Root>
    </OverlayPortal>
  )
}

const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${zIndexes.overlay.popup};
  background-color: #000a;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
`

const Card = styled.div<{
  $cardWidth?: string
  $cardMaxWidth?: string
  $cardMaxHeight?: string
}>`
  background-color: ${(props) => props.theme.colors.bg.primary};
  width: ${(props) => props.$cardWidth ?? 'min(32rem, calc(100vw - 2rem))'};
  max-width: ${(props) => props.$cardMaxWidth ?? 'calc(100vw - 2rem)'};
  max-height: ${(props) => props.$cardMaxHeight ?? 'calc(100vh - 2rem)'};
  overflow: auto;
  padding: 1rem;
  box-sizing: border-box;
  border: 1px solid #ffffff24;
  border-radius: 0.45rem;
  box-shadow: 0 0.5rem 2rem #0009;
`

const Title = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.05rem;
  font-weight: 700;
  min-width: 15rem;
  margin-bottom: 0.7rem;
`
