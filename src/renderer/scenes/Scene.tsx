import styled from 'styled-components'
import { useControlSelector } from '../redux/store'
import { useDispatch } from 'react-redux'
import {
  setActiveScene,
  newScene,
  removeScene,
  setActiveSceneBombacity,
  setActiveSceneName,
  copyActiveScene,
  setActiveSceneAutoEnabled,
} from '../redux/controlSlice'
import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import DisableIcon from '@mui/icons-material/DoNotDisturb'
import Slider from '../base/Slider'
import { ButtonMidiOverlay } from '../../features/midi/react/MidiOverlay'
import Input from '../base/Input'
import { Draggable } from 'react-beautiful-dnd'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import CopyIcon from '@mui/icons-material/FileCopy'
import { SceneType } from '../../shared/Scenes'

function getColor(epicness: number) {
  const hueStart = 250
  const hueRange = 110 // 170
  const hue = (hueStart + epicness * hueRange) % 360
  return `hsl(${hue}, ${40}%, ${50}%)`
}

interface Props {
  sceneType: SceneType
  index: number
  id: string
}

export function Scene({ sceneType, index, id }: Props) {
  const isActive = useControlSelector(
    (control) => control[sceneType].active === id
  )
  const dispatch = useDispatch()
  const epicness = useControlSelector(
    (control) => control[sceneType].byId[id].epicness
  )
  const autoEnabled = useControlSelector(
    (control) => control[sceneType].byId[id].autoEnabled
  )
  const name = useControlSelector((control) => control[sceneType].byId[id].name)

  const onNameChange = (newVal: string) => {
    dispatch(
      setActiveSceneName({
        sceneType,
        val: newVal,
      })
    )
  }

  const onBombacityChange = (newVal: number) => {
    dispatch(
      setActiveSceneBombacity({
        sceneType,
        val: newVal,
      })
    )
  }

  const onAutoEnabledChange = (newVal: boolean) => {
    dispatch(
      setActiveSceneAutoEnabled({
        sceneType,
        val: newVal,
      })
    )
  }

  const onRemoveScene = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.stopPropagation()
    dispatch(
      removeScene({
        sceneType,
        val: { index: index },
      })
    )
  }

  let style: React.CSSProperties = {
    backgroundColor: sceneType === 'light' ? getColor(epicness) : undefined,
  }

  if (isActive) {
    style.border = '2px solid'
    style.color = '#fffc'
  }

  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps}>
          <ButtonMidiOverlay
            action={{
              type: 'setActiveSceneIndex',
              sceneType: sceneType,
              index: index,
            }}
          >
            <Root
              style={style}
              onClick={() => {
                dispatch(
                  setActiveScene({
                    sceneType: sceneType,
                    val: id,
                  })
                )
              }}
            >
              <Number>{index + 1}</Number>
              {isActive ? (
                <Column>
                  <Row>
                    <Input value={name} onChange={onNameChange} />
                    {/* <Switch
                      size="small"
                      checked={autoEnabled}
                      onChange={(e) => onAutoEnabledChange(e.target.checked)}
                    /> */}
                    <Disable onClick={() => onAutoEnabledChange(!autoEnabled)}>
                      <DisableIcon
                        fontSize="small"
                        style={{ opacity: autoEnabled ? 0.3 : 1 }}
                      />
                    </Disable>
                  </Row>
                  {sceneType === 'light' && (
                    <>
                      <Sp />
                      <Slider
                        value={epicness}
                        radius={0.3}
                        orientation="horizontal"
                        onChange={onBombacityChange}
                      />
                    </>
                  )}
                </Column>
              ) : (
                <>
                  <div style={{ color: autoEnabled ? '#fff' : 'fff7' }}>
                    {name}
                  </div>
                  <div style={{ flex: '1 0 0' }} />
                  {!autoEnabled && <DisableIcon fontSize="small" />}
                  <IconButton
                    aria-label="delete scene"
                    size="small"
                    onClick={onRemoveScene}
                  >
                    <CloseIcon />
                  </IconButton>
                </>
              )}
              <div {...provided.dragHandleProps}>
                <DragHandleIcon />
              </div>
            </Root>
          </ButtonMidiOverlay>
        </div>
      )}
    </Draggable>
  )
}

export function NewScene({ sceneType }: { sceneType: SceneType }) {
  const dispatch = useDispatch()
  const onNew = () => {
    dispatch(newScene(sceneType))
  }
  const onCopy = () => {
    dispatch(copyActiveScene(sceneType))
  }

  return (
    <Root>
      <IconButton onClick={onNew}>
        <AddIcon />
      </IconButton>
      <IconButton onClick={onCopy}>
        <CopyIcon />
      </IconButton>
    </Root>
  )
}

const Root = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
  color: #fffa;
  border-radius: 7px;
  box-sizing: border-box;
  border: 1px solid #7777;
  background-color: ${(props) => props.theme.colors.bg.lighter};
  height: 3.4rem;
  :hover {
    border: 1px solid;
    cursor: pointer;
  }
`

const Number = styled.div`
  width: 1rem;
  font-size: 0.7rem;
  margin-left: -0.3rem;
  margin-right: 1rem;
  text-align: right;
`

const Column = styled.div`
  flex: 1 0 auto;
  margin-right: 1rem;
`

const Sp = styled.div`
  height: 0.5rem;
`

const Row = styled.div`
  display: flex;
  align-items: center;
`

const Disable = styled.div`
  cursor: pointer;
`
