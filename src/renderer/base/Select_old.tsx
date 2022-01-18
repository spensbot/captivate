import { useEffect, useState } from 'react'
import styled from 'styled-components'
import zIndexes from '../zIndexes'
import wrapClick from './wrapClick'

interface Button {
  label: string
  onClick: () => void
}
interface Props<T> {
  value: T
  options: readonly T[]
  onChange: (newVal: T) => void
  width?: string
  extraButton?: Button
}

export default function Select<T>({
  value,
  options,
  onChange,
  width = '7rem',
  extraButton,
}: Props<T>) {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  function optionOnClick(option: T) {
    return () => {
      onChange(option)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const clickAwayListener = (e: MouseEvent) => {
        setIsOpen(false)
      }
      document.addEventListener('click', clickAwayListener)
      return () => {
        document.removeEventListener('click', clickAwayListener)
      }
    }
  }, [isOpen])

  return (
    <Root width={width}>
      <Value onClick={wrapClick(() => setIsOpen(!isOpen))}>{value}</Value>
      {isOpen && (
        <Options>
          {options.map((option, i) => {
            return option === value ? null : (
              <Option key={i} onClick={wrapClick(optionOnClick(option))}>
                {option}
              </Option>
            )
          })}
          {extraButton && (
            <Option
              onClick={extraButton.onClick}
              style={{ borderTop: `1px solid #777` }}
            >
              {extraButton.label}
            </Option>
          )}
        </Options>
      )}
    </Root>
  )
}

const Root = styled.div<{ width: string }>`
  position: relative;
  width: ${(props) => props.width};
`

const ViewerValue = styled.span`
  font-size: 0.9rem;
  padding: 0.1rem 0.3rem;
  background-color: ${(props) => props.theme.colors.background.tertiary};
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
`

const Value = styled.div`
  padding: ${(props) => props.theme.spacing(0.2)}
    ${(props) => props.theme.spacing(0.5)};
  cursor: pointer;
  background-color: ${(props) => props.theme.colors.background.tertiary};
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: ${(props) => props.theme.border.radius};
`

const Option = styled.div`
  padding: ${(props) => props.theme.spacing(0.2)}
    ${(props) => props.theme.spacing(0.5)};
  cursor: pointer;
  :hover {
    background-color: #7772;
  }
`

const Options = styled.div`
  /* padding: ${(props) => props.theme.spacing(0.2)} ${(props) =>
    props.theme.spacing(0.5)}; */
  position: absolute;
  top: 110%;
  left: 0%;
  width: 100%;
  background-color: ${(props) => props.theme.colors.background.tertiary};
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: ${(props) => props.theme.border.radius};
  z-index: ${zIndexes.popups};
`
