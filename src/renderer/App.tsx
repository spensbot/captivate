import styled from 'styled-components'
import Video from './pages/VisualizerPage'
import Modulation from './pages/Scenes'
import Universe from './pages/Universe'
import Movers from './pages/Movers'
import Lighting3DPage from './pages/Lighting3D'
import Share from './pages/Share'
import Mixer from './pages/Mixer'
import MenuBar from './menu/MenuBar'
import { useTypedSelector } from './redux/store'
import FullscreenOverlay from './overlays/FullscreenOverlay'
import BottomStatus from './menu/BottomStatus'
import LedPage from './pages/LedPage'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorBoundaryFallback from './error-boundary/ErrorBoundaryFallback'

export default function App() {
  const activePage = useTypedSelector((state) => state.gui.activePage)

  function getActivePage() {
    if (activePage == 'Modulation') return <Modulation />
    if (activePage == 'Universe') return <Universe />
    if (activePage == 'Movers') return <Movers />
    if (activePage == 'Lighting3D') return <Lighting3DPage />
    if (activePage == 'Video') return <Video />
    if (activePage == 'Share') return <Share />
    if (activePage == 'Mixer') return <Mixer />
    if (activePage == 'Led') return <LedPage />
    console.error(`Bad activePage value: ${activePage}`)
    return null
  }

  return (
    <Root>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <MenuBar />
        <Col>
          <PageWrapper style={{ overflow: 'auto' }}>
            {getActivePage()}
          </PageWrapper>
          <BottomStatus />
        </Col>
        <FullscreenOverlay />
      </ErrorBoundary>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  position: relative;
  height: 100vh;
`

const PageWrapper = styled.div`
  flex: 1 1 0;
`

const Col = styled.div`
  flex: 1 0 0;
  display: flex;
  flex-direction: column;
`
