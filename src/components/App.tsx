import React from 'react'
import Video from './pages/Visualizer'
import Modulation from './pages/Scenes'
import Universe from './pages/Universe'
import Share from './pages/Share'
import Mixer from './pages/Mixer'
import MenuBar from './MenuBar'
import { useTypedSelector } from '../redux/store'

export default function App() {
  const activePage = useTypedSelector(state => state.gui.activePage)

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'row',
      height: '100vh'
    },
    activePage: {
      flex: '1 1 auto',
      overflow: activePage === 'Video' ? undefined : 'auto',
      height: '100%',
    }
  }

  function getActivePage() {
    if (activePage == 'Modulation') return (<Modulation />)
    if (activePage == 'Universe') return (<Universe />)
    if (activePage == 'Video') return (<Video />)
    if (activePage == 'Share') return (<Share />)
    if (activePage == 'Mixer') return (<Mixer />)
  }

  return (
    <div style={styles.root}>
      <MenuBar />
      <div style={styles.activePage}>
        {getActivePage()}
      </div>
    </div>
  )
}