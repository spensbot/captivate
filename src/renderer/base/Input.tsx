import styled from 'styled-components'

interface Props {
  value: string
  onChange: (newVal: string) => void
  onEmptyDelete?: () => void
}

export default function Input({ value, onChange }: Props) {
  return <Root value={value} onChange={(e) => onChange(e.target.value)} />
}

const Root = styled.input`
  border: none;
  color: #fff;
  background-color: #fff1;
  width: 100%;
  font-size: 1rem;
`

export function MultilineInput({ value, onChange, onEmptyDelete }: Props) {
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
