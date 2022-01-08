import { render } from 'react-dom'
import { ThemeProvider } from 'styled-components'
import GlobalStyle from './GlobalStyle'
import App from './App'
import * as themes from './theme'
import { Provider } from 'react-redux'
import store from './redux/store'

const theme = themes.dark()

render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <App />
    </ThemeProvider>
  </Provider>,
  document.getElementById('root')
)
