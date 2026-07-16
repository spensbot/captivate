import { useDmxSelector, useBaseParam } from '../redux/store'
import { fixtureChannelLeafChannels } from '../../shared/dmxFixtures'
import ParamSlider from './ParamSlider'

interface Props {
  splitIndex: number
}

export default function FocusControl({ splitIndex }: Props) {
  const hasFocusChannels = useDmxSelector((dmx) => {
    for (const fixtureTypeId of dmx.fixtureTypes) {
      const fixtureType = dmx.fixtureTypesByID[fixtureTypeId]
      if (fixtureType === undefined) continue
      for (const channel of fixtureType.channels) {
        for (const leaf of fixtureChannelLeafChannels(channel)) {
          if (leaf.type === 'focus') {
            return true
          }
        }
      }
    }
    return false
  })

  const baseFocus = useBaseParam('focus', splitIndex)

  if (!hasFocusChannels || baseFocus === undefined) return null

  return (
    <ParamSlider param="focus" splitIndex={splitIndex} label="Focus" />
  )
}
