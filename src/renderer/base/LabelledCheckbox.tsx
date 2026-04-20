import { Checkbox } from "@mui/material"
import styled from "styled-components"

interface Props {
  checked: boolean,
  onChange: (newVal: boolean) => void,
  label?: string
}

export default function LabelledCheckbox({checked, onChange, label}: Props) {
  const tooltip = label?.trim() || 'Toggle option'
  return (
    <Root>
      {label && <Label>{label}</Label>}
      <Checkbox
        checked={checked}
        onClick={_ => onChange(!checked)}
        title={tooltip}
        inputProps={{ 'aria-label': tooltip }}
      />
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
`

const Label = styled.div`
  font-size: 1rem;
  margin-right: 0.5rem;
`
