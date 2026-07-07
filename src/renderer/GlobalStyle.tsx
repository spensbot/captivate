import { createGlobalStyle } from 'styled-components'

export default createGlobalStyle`
  html {
    height: 100%;
    -webkit-text-size-adjust: 100%;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    height: 100%;
    font-size: 0.8rem;
    color: ${(props) => props.theme.colors.text.primary};
    background-color: ${(props) => props.theme.colors.bg.primary};
    font-family: Arial, Helvetica, sans-serif;
    user-select: none;
    overflow: hidden;
  }

  #root {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='button']):not(
      [type='submit']
    ):not([type='reset']):not([type='file']):not([type='image']):not([type='color']),
  textarea,
  select {
    background-color: ${(props) => props.theme.colors.bg.lighter};
    color: ${(props) => props.theme.colors.text.primary};
    border: 1px solid ${(props) => props.theme.colors.divider};
  }

  input:disabled:not([type='checkbox']):not([type='radio']),
  textarea:disabled,
  select:disabled {
    color: ${(props) => props.theme.colors.text.secondary};
    opacity: 0.72;
  }

  input::placeholder,
  textarea::placeholder {
    color: ${(props) => props.theme.colors.text.secondary};
    opacity: 0.85;
  }

  button,
  [role='button'] {
    color: ${(props) => props.theme.colors.button.text};
  }

  button svg,
  button .MuiSvgIcon-root,
  [role='button'] svg,
  [role='button'] .MuiSvgIcon-root {
    color: ${(props) => props.theme.colors.button.icon};
  }

  *::-webkit-scrollbar {
    display: none;
  }
`
