import React from 'react'
import ProgressCircle from './ProgressCircle'
import { useTypedSelector } from '../redux/store'

type Props = {
  radius: number
}

export default function Counter({radius}: Props) {

  const time = useTypedSelector(state => state.time);

  const styles: {[key: string]: React.CSSProperties} = {
    container: {
      position: 'relative',
      width: `${radius * 2}px`,
      height: `${radius * 2}px`
    },
    progressRing: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    number: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: `${radius * 1.7}px`
    }
  }

  return (
    <div style={styles.container}>
      <ProgressCircle style={{}} ratio={time.phase / time.quantum} radius={radius}/>
      {/* <div style={styles.number}>
        <ProgressCircle ratio={time.pos} radius={radius-10}/>
      </div> */}
      <div style={styles.number}>
        <span>{time.beats}</span>
      </div>
    </div>
  )
}
