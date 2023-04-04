import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import zIndexes from '../zIndexes'
import CloseIcon from '@mui/icons-material/Close'
import useBounds from '../../features/ui/react/hooks/useBounds'

interface Props {
  title: string
  children: React.ReactNode
  onClose: () => void
}

const PADDING_REM = 1

function remToPx(rem: number) {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export default function Popup({ title, onClose, children }: Props) {
  const [rootRef, rootBounds] = useBounds()
  const [popupRef, popupBounds] = useBounds()

  const style: React.CSSProperties = {}

  if (rootBounds && popupBounds) {
    const padding = remToPx(PADDING_REM)

    if (rootBounds.top + popupBounds.height + padding > window.innerHeight) {
      style.bottom = padding
    } else {
      style.top = rootBounds.top
    }

    if (rootBounds.left + popupBounds.width + padding > window.innerWidth) {
      style.right = padding
    } else {
      style.left = rootBounds.left
    }
  }

  return (
    <Root ref={rootRef}>
      <Dimmer
        onClick={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <Popup_ ref={popupRef} style={style}>
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
      </Popup_>
    </Root>
  )
}

const Root = styled.div`
  cursor: default;
`

const Dimmer = styled.div`
  position: fixed;
  background-color: #000a;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: ${zIndexes.popups};
`

const Popup_ = styled.div`
  background-color: ${(props) => props.theme.colors.bg.primary};
  position: fixed;
  width: fit-content;
  height: fit-content;
  padding: 1rem;
  z-index: ${zIndexes.popups};
  box-shadow: 0px 5px 21px 8px #000000;
`

const Title = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.3rem;
  min-width: 15rem;
  margin-bottom: 1rem;
`
