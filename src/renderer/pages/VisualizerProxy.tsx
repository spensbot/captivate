import { useEffect, useRef } from 'react'
import styled from 'styled-components'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { send_open_page_window } from '../ipcHandler'

export default function VisualizerProxy() {
  const openedRef = useRef(false)

  useEffect(() => {
    if (openedRef.current) {
      return
    }
    openedRef.current = true
    send_open_page_window('Video')
  }, [])

  return (
    <Root>
      <Card>
        <Title>Visualizer Runs In Its Own Window</Title>
        <Body>
          Visualizer rendering is isolated in a dedicated renderer to keep the main app
          responsive.
        </Body>
        <OpenButton onClick={() => send_open_page_window('Video')}>
          <OpenInNewIcon fontSize="small" />
          Open / Focus Visualizer
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
  width: min(42rem, 100%);
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.5rem;
  background: ${(props) => props.theme.colors.bg.darker};
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`

const Title = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.primary};
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

