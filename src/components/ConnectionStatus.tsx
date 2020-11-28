import React from 'react'
import { useTypedSelector } from '../redux/store'

export default function ConnectionStatus() {

  const dmxConnection = useTypedSelector(state => state.connections.dmx);

  const styles = [
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
