import { useMemo } from 'react'
import {
  getAutoSceneTargetEnergy,
  resolveLightAutoSceneCueId,
} from '../../shared/autoScene'
import { useControlSelector } from '../redux/store'
import { useRealtimeSelector } from '../redux/realtimeStore'

/** Active auto cue target scene id for light scenes (null if none / same as active). */
export function useLightAutoSceneCueId(): string | null {
  const lightAuto = useControlSelector((control) => control.light.auto)
  const lightScenes = useControlSelector((control) => control.light)
  const audio = useRealtimeSelector((state) => state.audio)

  return useMemo(() => {
    const targetEnergy = getAutoSceneTargetEnergy(lightAuto, audio)
    return resolveLightAutoSceneCueId(lightScenes, targetEnergy)
  }, [lightAuto, lightScenes, audio])
}
