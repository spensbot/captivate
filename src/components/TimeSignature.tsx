import React from 'react';
import { useSelector } from 'react-redux';
import Divider from './Divider';

export default function TimeSignature() {

  const signature = useSelector(state => state.time.signature);

  const styles = {
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
      // fontSize: '1.3rem',
      margin: '0 0.5rem 0 0',
    },
    spaced: {
      margin: '0 1rem 0 0'
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.fraction}>
        {/* <span>{signature.numerator}</span>
        <Divider thickness={'1.5px'} color={'white'}/>
        <span>{signature.numerator}</span> */}
        <span>{signature.numerator}/{signature.denominator}</span>
      </div>
      <span style={styles.spaced}>Time</span>
    </div>
  )
}
