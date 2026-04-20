import { createGlobalStyle } from 'styled-components'

export default createGlobalStyle`
  body {
    margin: 0;
    font-size: 0.8rem;
    color: ${(props) => props.theme.colors.text.primary};
    background-color: ${(props) => props.theme.colors.bg.primary};
    font-family: Arial, Helvetica, sans-serif;
    user-select: none;
  }

  input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='button']):not(
      [type='submit']
    ):not([type='reset']):not([type='file']):not([type='image']):not([type='color']),
  textarea,
  select {
    background-color: #000000;
    color: #ffffff;
  }

  input:disabled:not([type='checkbox']):not([type='radio']),
  textarea:disabled,
  select:disabled {
    color: rgba(255, 255, 255, 0.38);
  }

  input::placeholder,
  textarea::placeholder {
    color: rgba(255, 255, 255, 0.45);
  }

  *::-webkit-scrollbar {
    display: none;
  }
`
