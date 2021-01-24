import React from 'react';
import { useTypedSelector } from '../redux/store';

export default function FPS() {

  const dt = useTypedSelector(state => state.time.dt);

  return (
    <span style={{fontSize: '0.8rem'}}>{`${Math.floor(1000 / dt)} FPS`}</span>
  )
}
