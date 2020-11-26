import React from 'react'
import { useSelector } from 'react-redux';

export default function ConnectionStatus() {

  const dmxConnection = useSelector(state => state.connections.dmx);

  const styles: React.CSSProperties[] = [
    {
      color: dmxConnection.isConnected ? '#44cc44' : '#cc4444',
      padding: '0.2rem'
    },
    {
      textDecoration: 'underline'
    }   
  ]

  if (dmxConnection.isConnected) {
    return (
      <div style={styles[1]}>
        DMX: Connected
      </div>
    )
  }

  return (
    <div style={styles[1]}>
      DMX: No devices found <span style={styles[2]}>Troubleshoot</span>
    </div>
  )
}
