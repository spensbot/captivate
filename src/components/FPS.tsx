import React from 'react';
import { useTypedSelector } from '../redux/store';

export default function Time() {

  const dt = useTypedSelector(state => state.time.dt);

  const styles = {
    root: {
      
    },
  }

  return (
    <span style={styles.root}>{`${Math.floor(1000 / dt)} FPS`}</span>
  )
}
