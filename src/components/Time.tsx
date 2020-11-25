import React from 'react';
import { useSelector } from 'react-redux';
import Counter from './Counter';
import TimeSignature from './TimeSignature';

export default function Time() {

  const height = 50;

  const bpm = useSelector(state => state.time.bpm);

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
