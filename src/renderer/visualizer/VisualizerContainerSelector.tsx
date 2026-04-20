import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { useActiveVisualScene } from '../redux/store'
import { setVisualSceneConfig } from '../redux/controlSlice'
import {
  VisualizerPreviewAspectRatio,
  visualizerPreviewAspectRatioDisplayName,
  visualizerPreviewAspectRatioList,
} from '../../visualizer/threejs/layers/LayerConfig'

export default function VisualizerContainerSelector() {
  const config = useActiveVisualScene((scene) => scene.config)
  const dispatch = useDispatch()

  return (
    <Root>
      <Row>
        <ControlGroup>
          <Label>Canvas</Label>
          <Select
            value={config.previewAspectRatio}
            onChange={(event) =>
              dispatch(
                setVisualSceneConfig({
                  ...config,
                  previewAspectRatio:
                    event.target.value as VisualizerPreviewAspectRatio,
                })
              )
            }
          >
            {visualizerPreviewAspectRatioList.map((ratio) => (
              <option key={ratio} value={ratio}>
                {visualizerPreviewAspectRatioDisplayName[ratio]}
              </option>
            ))}
          </Select>
        </ControlGroup>
      </Row>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.45);
  width: 100%;
  box-sizing: border-box;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  width: 100%;
  min-width: 0;
`

const ControlGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  flex: 1 1 0;
`

const Label = styled.div`
  font-size: 0.75rem;
  color: ${(props) => props.theme.colors.text.secondary};
  white-space: nowrap;
`

const Select = styled.select`
  min-width: 10rem;
  max-width: 100%;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.25rem;
  padding: 0.25rem 0.4rem;
  background: ${(props) => props.theme.colors.bg.primary};
  color: ${(props) => props.theme.colors.text.primary};
`
