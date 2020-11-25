import React from 'react';
import { useSelector } from 'react-redux';

export default function Time() {

  const dt = useSelector(state => state.time.dt);

  const styles = {
    root: {

    },
  }

  return (
    <span style={styles.root}>{`${Math.floor(1000 / dt)} FPS`}</span>
  )
}
