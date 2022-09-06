import { useRealtimeSelector } from '../redux/realtimeStore'

export default function Counter2() {
  const time = useRealtimeSelector((state) => state.time)

  const beats = Array(time.link.quantum).fill(0)
  const phase = time.beats % time.link.quantum
  beats[Math.floor(phase)] = 1 - (phase % 1.0)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: 10,
        width: 200,
        backgroundColor: '#0008',
      }}
    >
      {beats.map((beat, index) => {
        return (
          <div
            key={index}
            style={{ flex: '1 0 0', backgroundColor: '#fff', opacity: beat }}
          />
        )
      })}
    </div>
  )
}
