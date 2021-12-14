import React from 'react'
import styled from 'styled-components'
import Video from './pages/Visualizer'
import Modulation from './pages/Scenes'
import Universe from './pages/Universe'
import Share from './pages/Share'
import Mixer from './pages/Mixer'
import MenuBar from './MenuBar'
import { useTypedSelector } from '../redux/store'
import FullscreenOverlay from './overlays/FullscreenOverlay'

export default function App() {
  const activePage = useTypedSelector(state => state.gui.activePage)

  function getActivePage() {
    if (activePage == 'Modulation') return (<Modulation />)
    if (activePage == 'Universe') return (<Universe />)
    if (activePage == 'Video') return (<Video />)
    if (activePage == 'Share') return (<Share />)
    if (activePage == 'Mixer') return (<Mixer />)
  }

  return (
    <Root>
      <MenuBar />
      <PageWrapper style={{overflow: activePage === 'Video' ? undefined : 'auto'}}>
        {getActivePage()}
      </PageWrapper>
      <FullscreenOverlay />
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