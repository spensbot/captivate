import styled from 'styled-components'
import {
  approximateStandardColor,
  colorByName,
  ColorChannel,
  standardColorNames,
} from '../../shared/dmxColors'
import wrapClick from './wrapClick'

interface Props {
  color: ColorChannel
  onChange: (newColor: ColorChannel) => void
}

export default function ColorPicker(props: Props) {
  const approximate = approximateStandardColor(props.color)

  return (
    <Root>
      {standardColorNames.map((color) => {
        const isActive = color === approximate
        return (
          <Color
            isActive={isActive}
            onClick={wrapClick(() => {
              props.onChange(colorByName(color))
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
