import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import * as engine from './engine/engine'
import { store } from './redux/store'
import { realtimeStore, realtimeContext } from './redux/realtimeStore'
import App from './components/App'
import {GlobalStyle} from './styles/GlobalStyle'
import Helmet from 'react-helmet';
import { createTheme } from '@material-ui/core/styles'
import root from './util/prepareDOM'
import { ThemeProvider } from '@material-ui/core'

import '../tests/test'

console.log('Running Index.tsx')

engine.init(store, realtimeStore)

const theme = createTheme({
  palette: {
    type: 'dark'
  }
});

theme.palette.type

render(
  <Provider store={store}>
    <Provider store={realtimeStore} context={realtimeContext}>
      {/* <CssBaseline /> */}
      <ThemeProvider theme={theme}>
        <Helmet>
          <meta charSet="utf-8" />
          <title>Captivate - Lighting and Visual Synth</title>
          {/* <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'; media-src * 'unsafe-inline' 'unsafe-eval'" /> */}
        </Helmet>
        <GlobalStyle />
        <App />
      </ThemeProvider>
    </Provider>
  </Provider> 
  , root
)