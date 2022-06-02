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

  *::-webkit-scrollbar {
    display: none;
  }
`
