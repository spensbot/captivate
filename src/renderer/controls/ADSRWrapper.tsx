import ADSR, { Control } from './ADSR'
import { useActiveLightScene } from '../redux/store'
import { setRandomizer } from '../redux/controlSlice'
import { useDispatch } from 'react-redux'

interface Props {
  splitIndex: number | null
}

export default function ADSRWrapper({ splitIndex }: Props) {
  const state = useActiveLightScene((scene) => {
    if (splitIndex === null) {
      return scene.randomizer
    } else {
      return scene.splitScenes[splitIndex].randomizer
    }
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
    min: 50,
    max: 5000,
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
