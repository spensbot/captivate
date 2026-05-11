import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import Video from './pages/VisualizerPage'
import VisualizerProxy from './pages/VisualizerProxy'
import Modulation from './pages/Scenes'
import Universe from './pages/Universe'
import Movers from './pages/Movers'
import Lighting3DPage from './pages/Lighting3D'
import Lighting3DProxy from './pages/Lighting3DProxy'
import AtmosphericsPage from './pages/Atmospherics'
import LaserProxy, { LaserAlphaPage } from './pages/Laser'
import Share from './pages/Share'
import Mixer from './pages/Mixer'
import MenuBar from './menu/MenuBar'
import Visualizer from './visualizer/Visualizer'
import DetachedVisualizerFullscreenBar from './visualizer/DetachedVisualizerFullscreenBar'
import { useTypedSelector } from './redux/store'
import { setActivePage } from './redux/guiSlice'
import { universeHasMovers } from '../shared/dmxFixtures'
import FullscreenOverlay from './overlays/FullscreenOverlay'
import BottomStatus from './menu/BottomStatus'
import LedPage from './pages/LedPage'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorBoundaryFallback from './error-boundary/ErrorBoundaryFallback'
import useGlobalControlTooltips from './hooks/useGlobalControlTooltips'
import AutoManagedSplitSync from './sync/AutoManagedSplitSync'

export default function App() {
  useGlobalControlTooltips()
  const dispatch = useDispatch()
  const activePage = useTypedSelector((state) => state.gui.activePage)
  const ledSidebarEnabled = useTypedSelector((state) => state.gui.ledSidebarEnabled)
  const hasMoverFixtures = useTypedSelector((state) =>
    universeHasMovers(state.dmx.present.universe, state.dmx.present.fixtureTypesByID)
  )
  useEffect(() => {
    if (activePage === 'Movers' && !hasMoverFixtures) {
      dispatch(setActivePage('Universe'))
    }
  }, [activePage, dispatch, hasMoverFixtures])
  useEffect(() => {
    if (activePage === 'Led' && !ledSidebarEnabled) {
      dispatch(setActivePage('Universe'))
    }
  }, [activePage, dispatch, ledSidebarEnabled])
  const detachedPage = new URLSearchParams(window.location.search).get('page')
  const isDedicatedLighting3DWindow = detachedPage === 'Lighting3D'
  const isDedicatedLaserWindow = detachedPage === 'Laser'
  const isDedicatedVisualizerWindow =
    detachedPage === 'Video' || detachedPage === 'Streaming'
  const isDedicatedVisualizerViewportWindow = detachedPage === 'VideoViewport'

  function getActivePage() {
    if (activePage == 'Modulation') return <Modulation />
    if (activePage == 'Universe') return <Universe />
    if (activePage == 'Movers') return <Movers />
    if (activePage == 'Lighting3D') return <Lighting3DProxy />
    if (activePage == 'Atmospherics') return <AtmosphericsPage />
    if (activePage == 'Laser') return <LaserProxy />
    if (activePage == 'Video') return <VisualizerProxy />
    if (activePage == 'VideoViewport') return <VisualizerProxy />
    if (activePage == 'Streaming') return <VisualizerProxy />
    if (activePage == 'Share') return <Share />
    if (activePage == 'Mixer') return <Mixer />
    if (activePage == 'Led') return <LedPage />
    console.error(`Bad activePage value: ${activePage}`)
    return null
  }

  if (isDedicatedLighting3DWindow) {
    return (
      <Root>
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <Col>
            <PageWrapper>
              <Lighting3DPage standalonePreview />
            </PageWrapper>
          </Col>
          <FullscreenOverlay />
        </ErrorBoundary>
      </Root>
    )
  }

  if (isDedicatedLaserWindow) {
    return (
      <Root>
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <Col>
            <PageWrapper>
              <LaserAlphaPage standalone />
            </PageWrapper>
          </Col>
          <FullscreenOverlay />
        </ErrorBoundary>
      </Root>
    )
  }

  if (isDedicatedVisualizerWindow) {
    return (
      <Root>
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <Col>
            <PageWrapper>
              <Video standalone />
            </PageWrapper>
          </Col>
          <FullscreenOverlay />
        </ErrorBoundary>
      </Root>
    )
  }

  if (isDedicatedVisualizerViewportWindow) {
    return (
      <Root>
        <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
          <Col>
            <PageWrapper style={{ position: 'relative' }}>
              <DetachedVisualizerFullscreenBar />
              <Visualizer viewportOnly />
            </PageWrapper>
          </Col>
          <FullscreenOverlay />
        </ErrorBoundary>
      </Root>
    )
  }

  return (
    <Root>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <AutoManagedSplitSync />
        <MenuBar />
        <Col>
          <PageWrapper>
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
  width: 100vw;
  height: 100vh;
  overflow: hidden;
`

const PageWrapper = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
`

const Col = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`
