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

  /* resets */
  p {
    margin: 0;
  }
  button {
    appearance: none;
    border-style: none;
    padding: 0;
    background-color: transparent;
    color: inherit;
    font-family: inherit; /* 1 */
    font-size: 0.9rem;
    line-height: 1.15; /* 1 */
    margin: 0; /* 2 */
  }
`
