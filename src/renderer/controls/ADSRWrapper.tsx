import ADSR, { Control } from './ADSR'
import { useActiveScene } from '../redux/store'
import { setRandomizer } from '../redux/scenesSlice'
import { useDispatch } from 'react-redux'

interface Props {}

export default function ADSRWrapper({}: Props) {
  const state = useActiveScene((scene) => scene.randomizer)
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
        })
      )
    },
  }

  return <ADSR width={200} height={100} ratio={ratio} duration={duration} />
}
