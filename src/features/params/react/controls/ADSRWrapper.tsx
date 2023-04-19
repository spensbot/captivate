import ADSR, { Control } from './ADSR'
import { useActiveLightScene } from '../../../../renderer/redux/store'
import { setRandomizer } from '../../../../renderer/redux/controlSlice'
import { useDispatch } from 'react-redux'

interface Props {
  splitIndex: number
}

export default function ADSRWrapper({ splitIndex }: Props) {
  const state = useActiveLightScene((scene) => {
    return scene.splitScenes[splitIndex].randomizer
  })
  const dispatch = useDispatch()

  const ratio: Control = {
    val: state.envelopeRatio,
    min: 0,
    max: 1,
    onChange: (newVal) => {
      dispatch(
        setRandomizer({
          key: 'envelopeRatio',
          value: newVal,
          splitIndex,
        })
      )
    },
  }
  const duration: Control = {
    val: state.envelopeDuration,
    min: 0.1,
    max: 16,
    onChange: (newVal) => {
      dispatch(
        setRandomizer({
          key: 'envelopeDuration',
          value: newVal,
          splitIndex,
        })
      )
    },
  }

  return <ADSR width={200} height={100} ratio={ratio} duration={duration} />
}
