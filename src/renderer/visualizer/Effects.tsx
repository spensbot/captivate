import styled from 'styled-components'
import Effect from './Effect'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import { indexArray } from '../../shared/util'
import { useActiveVisualScene, useTypedSelector } from 'renderer/redux/store'
import { useDispatch } from 'react-redux'
import { activeVisualSceneEffect_add } from 'renderer/redux/controlSlice'

interface Props {}

export default function Effects({}: Props) {
  const dispatch = useDispatch()
  const activeVisualSceneId = useTypedSelector(
    (state) => state.control.present.visual.active
  )
  const effectsCount = useActiveVisualScene(
    (scene) => scene.effectsConfig.length
  )

  return (
    <Root>
      <Header>Effects</Header>
      <Items>
        {indexArray(effectsCount).map((index) => (
          <Effect key={activeVisualSceneId + index} index={index} />
        ))}
        <IconButton
          onClick={() =>
            dispatch(
              activeVisualSceneEffect_add({
                type: 'glitch',
              })
            )
          }
        >
          <AddIcon />
        </IconButton>
      </Items>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  padding: 0.1rem 0.3rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  color: ${(props) => props.theme.colors.text.secondary};
`

const Items = styled.div`
  flex: 1 0 0;
  display: flex;
  align-items: stretch;
`
