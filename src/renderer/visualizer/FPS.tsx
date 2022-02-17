import { useRealtimeSelector } from '../redux/realtimeStore'

export default function FPS({ dt }: { dt: number }) {
  // This allows the FPS to update any time the realtimeState updates
  useRealtimeSelector((state) => state)

  return (
    <div
      style={{
        position: 'absolute',
        fontSize: '0.9rem',
        padding: '1rem',
        cursor: 'pointer',
        userSelect: 'none',
        top: 0,
        left: 0,
      }}
    >
      {`${Math.floor(1000 / dt)} FPS`}
    </div>
  )
}
