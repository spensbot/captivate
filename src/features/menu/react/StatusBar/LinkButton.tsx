import React from 'react'
import { useRealtimeSelector } from '../../../../renderer/redux/realtimeStore'
import * as api from 'renderer/api'

export default function LinkButton() {
  const numPeers = useRealtimeSelector((state) => state.time.numPeers)
  const isEnabled = useRealtimeSelector((state) => state.time.isEnabled)

  const style: React.CSSProperties = {
    backgroundColor: isEnabled ? '#3d5a' : '#fff3',
    color: isEnabled ? '#eee' : '#fff9',
    borderRadius: '0.3rem',
    padding: '0.2rem 0.4rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
  }

  return (
    <div
      onClick={() => {
        api.mutations.user_command({ type: 'SetLinkEnabled', isEnabled: !isEnabled })
      }}
      style={style}
    >
      Link{isEnabled ? `: ${numPeers}` : ''}
    </div>
  )
}
