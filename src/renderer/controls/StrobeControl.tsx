import styled from 'styled-components'
import Tooltip from '@mui/material/Tooltip'
import { useDispatch } from 'react-redux'
import { useBaseParams } from '../redux/store'
import { setBaseParams } from '../redux/controlSlice'
import ParamSlider from './ParamSlider'

type StrobeMaskParam =
  | 'strobeRgb'
  | 'strobeWhite'
  | 'strobeWarmWhite'
  | 'strobeAmber'
  | 'strobeUv'

const strobeMaskButtons: {
  param: StrobeMaskParam
  label: string
  title: string
}[] = [
  {
    param: 'strobeRgb',
    label: 'RGB',
    title: 'Apply strobe to RGB color channels',
  },
  {
    param: 'strobeWhite',
    label: 'W',
    title: 'Apply strobe to White channels',
  },
  {
    param: 'strobeWarmWhite',
    label: 'WW',
    title: 'Apply strobe to Warm White channels',
  },
  {
    param: 'strobeAmber',
    label: 'A',
    title: 'Apply strobe to Amber channels',
  },
  {
    param: 'strobeUv',
    label: 'UV',
    title: 'Apply strobe to UV channels',
  },
]

export default function StrobeControl({ splitIndex }: { splitIndex: number }) {
  const dispatch = useDispatch()
  const baseParams = useBaseParams(splitIndex)

  if (baseParams.strobe === undefined) return null

  const setMask = (param: StrobeMaskParam, value: number) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: {
          [param]: value,
        },
      })
    )
  }

  return (
    <Root>
      <ParamSlider param={'strobe'} splitIndex={splitIndex} />
      <MaskColumn>
        {strobeMaskButtons.map(({ param, label, title }) => {
          const enabled = (baseParams[param] ?? 1) > 0.5
          return (
            <Tooltip key={param} title={title}>
              <MaskButton
                type="button"
                enabled={enabled}
                onClick={() => setMask(param, enabled ? 0 : 1)}
              >
                {label}
              </MaskButton>
            </Tooltip>
          )
        })}
      </MaskColumn>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: flex-start;
`

const MaskColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-right: 1rem;
  margin-top: 0.6rem;
`

const MaskButton = styled.button<{ enabled: boolean }>`
  width: 2rem;
  height: 2rem;
  border-radius: 1rem;
  border: 1px solid ${(props) => (props.enabled ? '#fff' : '#666')};
  background: ${(props) => (props.enabled ? '#ffffff22' : '#00000055')};
  color: ${(props) => (props.enabled ? '#fff' : '#aaa')};
  cursor: pointer;
  font-size: 0.65rem;
  line-height: 1;
  padding: 0;
`
