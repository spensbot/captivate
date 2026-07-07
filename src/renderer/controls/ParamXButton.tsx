import styled from 'styled-components'
import { DefaultParam } from 'shared/params'
import { useDispatch } from 'react-redux'
import { deleteBaseParams } from 'renderer/redux/controlSlice'

interface Props {
  splitIndex: number
  params: readonly (DefaultParam | string)[]
  /**
   * `floating` — absolutely positioned top-right of the nearest `position: relative` parent (pads).
   * `toolbar` — sits in a flex toolbar row so it never covers sliders or the plot.
   */
  placement?: 'floating' | 'toolbar'
}

export default function ParamXButton({
  splitIndex,
  params,
  placement = 'floating',
}: Props) {
  const dispatch = useDispatch()

  const onClick = () => {
    dispatch(
      deleteBaseParams({
        splitIndex,
        params,
      })
    )
  }

  return (
    <Root
      $toolbar={placement === 'toolbar'}
      type="button"
      aria-label="Remove control"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      X
    </Root>
  )
}

const Root = styled.button<{ $toolbar: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.95rem;
  height: 0.95rem;
  margin: 0;
  padding: 0;
  font: inherit;
  border-radius: 999px;
  border: 1px solid #ffffff44;
  background-color: #101521f0;
  cursor: pointer;
  color: ${(props) => props.theme.colors.button.text};
  font-size: 0.62rem;
  line-height: 1;
  user-select: none;
  z-index: 10;
  pointer-events: auto;
  flex-shrink: 0;
  :hover {
    color: ${(props) => props.theme.colors.text.primary};
    border-color: #ffffff77;
  }

  ${(p) =>
    p.$toolbar
      ? `
    position: static;
    margin-left: auto;
  `
      : `
    position: absolute;
    top: 0.22rem;
    right: calc(0.22rem - 10px);
  `}
`
