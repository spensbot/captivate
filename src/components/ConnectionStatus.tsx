import React from 'react'
import { useTypedSelector } from '../redux/store'

export default function ConnectionStatus() {

  const dmxConnection = useTypedSelector(state => state.connections.dmx);

  const style = {
    padding: '0.2rem',
    fontSize: '0.9rem'
  }

  if (dmxConnection.isConnected) {
    return (
      <div style={style}>
        DMX: <span style={{color: '#3f3'}}>Connected</span>
      </div>
    )
  }

  return (
    <div style={style}>
      DMX: <span style={{ color: '#f33' }}>No devices found </span><span style={{textDecoration: 'underline'}}>Troubleshoot</span>
    </div>
  )
}
