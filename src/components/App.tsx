import React from 'react'
import Video from './pages/Video'
import Modulation from './pages/Scenes'
import Universe from './pages/Universe'
import MenuBar from './MenuBar'
import { useTypedSelector } from '../redux/store'
import { Page } from '../redux/guiSlice'

export default function App() {
  const activePage = useTypedSelector(state => state.gui.activePage)

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      display: 'flex',
      flexDirection: 'row',
      width: '100vw',
      height: '100vh'
    },
    activePage: {
      flex: '1 0 0'
    }
  }

  function getActivePage() {
    if (activePage == Page.MODULATION) return (<Modulation />)
    if (activePage == Page.UNIVERSE) return (<Universe />)
    if (activePage == Page.VIDEO) return (<Video />)
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