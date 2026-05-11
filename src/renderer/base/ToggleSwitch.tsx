import styled from 'styled-components'

type Props = {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  title?: string
  'aria-label'?: string
}

export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  title,
  'aria-label': ariaLabel,
}: Props) {
  return (
    <Track
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel ?? title ?? 'Toggle'}
      $on={checked}
      onClick={() => {
        if (!disabled) {
          onChange(!checked)
        }
      }}
    >
      <Thumb $on={checked} />
    </Track>
  )
}

const Track = styled.button<{ $on: boolean }>`
  position: relative;
  width: 2.35rem;
  height: 1.12rem;
  border-radius: 999px;
  border: 1px solid
    ${(p) => (p.$on ? 'rgba(110, 190, 130, 0.75)' : p.theme.colors.divider)};
  background: ${(p) =>
    p.$on
      ? 'linear-gradient(180deg, rgba(46, 130, 78, 0.62), rgba(24, 82, 48, 0.82))'
      : 'linear-gradient(180deg, rgba(38, 42, 52, 0.96), rgba(18, 20, 26, 0.98))'};
  padding: 0;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #8eb2ff;
    outline-offset: 2px;
  }
`

const Thumb = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 50%;
  left: ${(p) => (p.$on ? 'calc(100% - 0.9rem - 2px)' : '2px')};
  transform: translateY(-50%);
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
  background: linear-gradient(180deg, #f4f7ff, #c5d0e6);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.42);
  transition: left 120ms ease;
  pointer-events: none;
`
