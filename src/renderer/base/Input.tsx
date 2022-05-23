import styled from 'styled-components'

interface Props {
  value: string
  onChange: (newVal: string) => void
  onEmptyDelete?: () => void
  size?: string
}

export default function Input({ value, onChange, size }: Props) {
  return (
    <Root
      style={{ fontSize: size }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

const Root = styled.input`
  border: none;
  color: #fff;
  background-color: #fff1;
  width: 100%;
  font-size: 1rem;
`

export function MultilineInput({
  size,
  value,
  onChange,
  onEmptyDelete,
}: Props) {
  console.log(value)
  const num_lines = value.split('\n').length
  return (
    <MLRoot
      rows={num_lines}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' && value === '' && onEmptyDelete) {
          onEmptyDelete()
        }
      }}
      style={{ fontSize: size }}
    />
  )
}

const MLRoot = styled.textarea`
  border: none;
  color: #fff;
  background-color: #fff1;
  width: 100%;
  font-size: 1rem;
  resize: none;
`
