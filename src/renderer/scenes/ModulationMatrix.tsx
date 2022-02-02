import { paramsList } from '../../shared/params'
import ModulationSlider, { AddModulationButton } from './ModulationSlider'

export default function ModulationMatrix({ index }: { index: number }) {
  return (
    <div>
      {paramsList.map((paramKey) => {
        return (
          <ModulationSlider
            key={paramKey + 'mod' + index.toString()}
            index={index}
            param={paramKey}
          />
        )
      })}
      <AddModulationButton index={index} />
    </div>
  )
}
