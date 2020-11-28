import React from 'react';
import { useTypedSelector } from '../redux/store';

export default function TimeSignature() {

  const signature = useTypedSelector(state => state.time.signature);

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    fraction: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '0 0.5rem 0 0',
    },
    spaced: {
      margin: '0 1rem 0 0'
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.fraction}>
        <span>{signature.numerator}/{signature.denominator}</span>
      </div>
      <span style={styles.spaced}>Time</span>
    </div>
  )
}
