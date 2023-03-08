import styled from 'styled-components'
import { Normalized } from 'math/util'
import {
  approximateStandardColor,
  colorByName,
  standardColorNames,
} from '../../shared/dmxColors'
import wrapClick from './wrapClick'

interface Props {
  hue: Normalized
  saturation: Normalized
  onChange: (newHue: Normalized, newSaturation: Normalized) => void
}

export default function ColorPicker(props: Props) {
  const approximate = approximateStandardColor(props)

  return (
    <Root>
      {standardColorNames.map((color) => {
        const isActive = color === approximate
        return (
          <Color
            isActive={isActive}
            onClick={wrapClick(() => {
              const channel = colorByName(color)
              props.onChange(channel.hue, channel.saturation)
            })}
          >
            {color}
          </Color>
        )
      })}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
`

const Color = styled.div<{ isActive: boolean }>`
  color: ${(props) => !props.isActive && props.theme.colors.text.secondary};
  margin-right: 0.5rem;
  cursor: pointer;
`
