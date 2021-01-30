import React from 'react'
import { useRealtimeSelector } from '../../redux/realtimeStore'

export default function XYWindow() {

  const {Height, Width, X, Y} = useRealtimeSelector(state => state.outputParams)

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'absolute',
      top: `${(1 - Y) * 100 - Height*50}%`,
      left: `${X * 100 - Width*50}%`,
      width: `${Width*100}%`,
      height: `${Height*100}%`,
      // transform: `translate(-${Width * 50}%, -${Height * 50}%)`,
      backgroundColor: '#fff2'
    }
  }

  return (
    <div style={styles.root}></div>
  )
}
