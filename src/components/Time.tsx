import React from 'react';
import { useTypedSelector } from '../redux/store';
import Counter from './Counter';
import TimeSignature from './TimeSignature';

export default function Time() {

  const height = 50;

  const bpm = useTypedSelector(state => state.time.bpm);

  const styles = {
    root: {
      display: 'flex',
      justifyContent: 'right',
      alignItems: 'center',
      fontSize: `${height * 0.75}px`,
    },
    spaced: {
      margin: '0 1rem 0 0'
    }
  }

  return (
    <div style={styles.root}>
      <TimeSignature />
      <span style={styles.spaced}>{`${bpm} BPM`}</span>
      <Counter radius={height/2}/>
    </div>
  )
}
