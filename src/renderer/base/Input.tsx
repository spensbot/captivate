import styled from 'styled-components'

interface Props {
  value: string
  onChange: (newVal: string) => void
  onEmptyDelete?: () => void
  size?: string
  placeholder?: string
}

export default function Input({ value, onChange, size, placeholder }: Props) {
  return (
    <Root
      style={{ fontSize: size }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

const Root = styled.input`
  border: none;
  color: #fff;
  background-color: #fff1;
  width: 100%;
  font-size: 1rem;
  padding: 0.1rem 0.3rem;
`

export function MultilineInput({
  size,
  value,
  onChange,
  onEmptyDelete,
}: Props) {
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
