import styled from 'styled-components'
import Video from './pages/Visualizer'
import Modulation from './pages/Scenes'
import Universe from './pages/Universe'
import Share from './pages/Share'
import Mixer from './pages/Mixer'
import MenuBar from './menu/MenuBar'
import { useTypedSelector } from './redux/store'
import FullscreenOverlay from './overlays/FullscreenOverlay'
import ErrorBoundary from './base/ErrorBoundary'

export default function App() {
  const activePage = useTypedSelector((state) => state.gui.activePage)

  function getActivePage() {
    if (activePage == 'Modulation') return <Modulation />
    if (activePage == 'Universe') return <Universe />
    if (activePage == 'Video') return <Video />
    if (activePage == 'Share') return <Share />
    if (activePage == 'Mixer') return <Mixer />
    console.error(`Bad activePage value: ${activePage}`)
    return null
  }

  return (
    <Root>
      <ErrorBoundary>
        <MenuBar />
        <PageWrapper style={{ overflow: 'auto' }}>
          {getActivePage()}
        </PageWrapper>
        <FullscreenOverlay />
      </ErrorBoundary>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  position: relative;
  flex-direction: row;
  height: 100vh;
`

const PageWrapper = styled.div`
  flex: 1 1 auto;
  height: '100%';
`
