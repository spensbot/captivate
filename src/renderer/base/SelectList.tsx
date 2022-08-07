import styled from 'styled-components'
import { secondaryEnabled } from './keyUtil'
import wrapClick from './wrapClick'

interface Props<T extends string> {
  list: T[]
  selected: T
  setSelected: (val: T) => void
  style?: React.CSSProperties
}

export default function SelectList<T extends string>({
  list,
  selected,
  setSelected,
  style,
}: Props<T>) {
  return (
    <Root style={style}>
      {list.map((item) => (
        <Item
          key={`${item}`}
          selected={item === selected}
          onClick={wrapClick(() => setSelected(item))}
        >
          {`${item}`}
        </Item>
      ))}
    </Root>
  )
}

interface MultiSelectProps<T extends string> {
  list: T[]
  selected: Set<T>
  setSelected: (newVal: Set<T>) => void
  style?: React.CSSProperties
}

export function MultiSelectList<T extends string>({
  list,
  selected,
  setSelected,
  style,
}: MultiSelectProps<T>) {
  return (
    <Root style={style}>
      {list.map((item) => (
        <Item
          key={`${item}`}
          selected={selected.has(item)}
          onClick={(e) => {
            let newSelected
            if (secondaryEnabled(e as unknown as MouseEvent)) {
              newSelected = new Set(selected)
              newSelected.add(item)
            } else {
              newSelected = new Set([item])
            }
            setSelected(newSelected)
          }}
        >
          {`${item}`}
        </Item>
      ))}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
`

const Item = styled.div<{ selected: boolean }>`
  margin-right: ${(props) => props.theme.spacing(0.5)};
  padding: ${(props) => props.theme.spacing(0.2)};
  opacity: ${(props) => (props.selected ? 1 : 0.5)};
  cursor: pointer;
  &:last-child {
    margin-bottom: 0;
  }
  &:hover {
    text-decoration: underline;
  }
`
