import React from 'react';
import { useRealtimeSelector } from '../redux/realtimeStore'

export default function FPS() {

  const dt = useRealtimeSelector(state => state.time.dt);

  return (
    <span style={{fontSize: '0.8rem'}}>{`${Math.floor(1000 / dt)} FPS`}</span>
  )
}
