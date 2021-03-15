import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 16px;
    color: #ddd;
    user-select: none;
  }

  #visualizer {
    position: absolute,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  }
`
