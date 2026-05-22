import { useEffect, useRef } from 'react'
import styled from 'styled-components'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { send_open_page_window } from '../ipcHandler'

export default function Lighting3DProxy() {
  const openedRef = useRef(false)

  useEffect(() => {
    if (openedRef.current) {
      return
    }
    openedRef.current = true
    send_open_page_window('Lighting3D')
  }, [])

  return (
    <Root>
      <Card>
        <TitleRow>
          <Title>Lighting 3D (Alpha)</Title>
          <AlphaTag>Not fully ready</AlphaTag>
        </TitleRow>
        <Body>
          Lighting 3D is in alpha and runs in its own window to keep the main app
          responsive. Expect incomplete behavior while we refine the preview.
        </Body>
        <OpenButton onClick={() => send_open_page_window('Lighting3D')}>
          <OpenInNewIcon fontSize="small" />
          Open / Focus Lighting 3D
        </OpenButton>
      </Card>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
`

const Card = styled.div`
  width: min(40rem, 100%);
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.5rem;
  background: ${(props) => props.theme.colors.bg.darker};
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
`

const Title = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.primary};
`

const AlphaTag = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 999px;
  padding: 0.1rem 0.42rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const Body = styled.div`
  font-size: 0.84rem;
  color: ${(props) => props.theme.colors.text.secondary};
`

const OpenButton = styled.button`
  border: 1px solid ${(props) => props.theme.colors.divider};
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
  border-radius: 0.33rem;
  padding: 0.4rem 0.55rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: fit-content;
  cursor: pointer;
`
