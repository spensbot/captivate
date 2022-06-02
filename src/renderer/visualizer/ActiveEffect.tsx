import styled from 'styled-components'
import Select from '../base/Select'
import {
  effectTypes,
  effectDisplayNames,
  effectTypeFromDisplayName,
  EffectConfig,
  initEffectConfig,
} from 'visualizer/threejs/effects/effectConfigs'
import { activeVisualSceneEffect_set } from 'renderer/redux/controlSlice'
import { useDispatch } from 'react-redux'
import { useActiveVisualScene } from 'renderer/redux/store'
import EffectEditor from './EffectEditor'

interface Props {}

export default function ActiveEffect({}: Props) {
  const effect: EffectConfig | undefined = useActiveVisualScene(
    (scene) => scene.effectsConfig[scene.activeEffectIndex]
  )
  const dispatch = useDispatch()

  if (effect === undefined) return null

  return (
    <Root>
      <Select
        label="Effect"
        val={effectDisplayNames[effect.type]}
        items={effectTypes.map((type) => effectDisplayNames[type])}
        onChange={(newDisplayName) =>
          dispatch(
            activeVisualSceneEffect_set(
              initEffectConfig(effectTypeFromDisplayName(newDisplayName))
            )
          )
        }
        style={{ fontSize: '1.2rem' }}
      />
      <EffectEditor
        config={effect}
        onChange={(newEffect) =>
          dispatch(activeVisualSceneEffect_set(newEffect))
        }
      />
    </Root>
  )
}

const Root = styled.div`
  padding: 1rem;
  flex: 1 0 0;
  border-right: 1px solid ${(props) => props.theme.colors.divider};
  display: flex;
  flex-direction: column;
  & > * {
    margin-bottom: 0.5rem;
  }
`
