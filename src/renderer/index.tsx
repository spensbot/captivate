import { render } from 'react-dom'
import { ThemeProvider } from 'styled-components'
import GlobalStyle from './GlobalStyle'
import App from './App'
import * as themes from './theme'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { realtimeStore, realtimeContext } from './redux/realtimeStore'

const theme = themes.dark()

render(
  <Provider store={store}>
    <Provider store={realtimeStore} context={realtimeContext}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <App />
      </ThemeProvider>
    </Provider>
  </Provider>,
  document.getElementById('root')
)
