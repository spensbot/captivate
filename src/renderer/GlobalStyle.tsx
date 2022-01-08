import { createGlobalStyle } from 'styled-components'

export default createGlobalStyle`
  body {
    margin: 0;
    font-family: sans-serif;
    font-size: 0.8rem;
    color: ${(props) => props.theme.colors.text.primary};
    background-color: ${(props) => props.theme.colors.bg.primary};
  }
`
