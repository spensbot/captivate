import React from 'react'
import Visualizer from '../Visualizer'

export default function Video() {
  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      width: '100vw',
      height: '100vh',
      position: 'relative'
    },
    child: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  }

  return (
    <div style={styles.root}>
      <Visualizer style={styles.child} />
      {/* <video controls style={styles.child} src="file:///Users/Spenser/Movies/videos/Pexels Videos 4708.mp4"/> */}
    </div>
  )
}