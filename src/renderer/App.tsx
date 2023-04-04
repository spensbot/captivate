import styled from 'styled-components'
import Video from './pages/visualizer/page'
import Modulation from './pages/scenes/page'
import Universe from './pages/universe/page'
import Share from './pages/share/page'
import Mixer from './pages/mixer/page'
import MenuBar from './menu/SideBar'
import { useTypedSelector } from './redux/store'
import FullscreenOverlay from './overlays/FullscreenOverlay'
import ErrorBoundarySentry from '../features/ui/react/error-boundary/ErrorBoundarySentry'
import BottomStatus from './menu/BottomStatus'
import LedPage from './pages/led/page'

export default function App() {
  const activePage = useTypedSelector((state) => state.gui.activePage)

  function getActivePage() {
    if (activePage == 'Modulation') return <Modulation />
    if (activePage == 'Universe') return <Universe />
    if (activePage == 'Video') return <Video />
    if (activePage == 'Share') return <Share />
    if (activePage == 'Mixer') return <Mixer />
    if (activePage == 'Led') return <LedPage />
    console.error(`Bad activePage value: ${activePage}`)
    return null
  }

  return (
    <Root>
      <ErrorBoundarySentry>
        <MenuBar />
        <Col>
          <PageWrapper style={{ overflow: 'auto' }}>
            {getActivePage()}
          </PageWrapper>
          <BottomStatus />
        </Col>
        <FullscreenOverlay />
      </ErrorBoundarySentry>
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
