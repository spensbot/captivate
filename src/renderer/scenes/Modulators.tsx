import { useActiveScene } from '../redux/store'
import ModulatorControl from './ModulatorControl'
import NewModulator from './NewModulator'

export default function Modulators() {
  const modulatorCount = useActiveScene(
    (activeScene) => activeScene.modulators.length
  )

  const indexes = Array.from(Array(modulatorCount).keys())

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        overflow: 'scroll',
        maxWidth: '100%',
      }}
    >
      {indexes.map((index) => {
        return <ModulatorControl key={index} index={index} />
      })}
      <NewModulator />
    </div>
  )
}
