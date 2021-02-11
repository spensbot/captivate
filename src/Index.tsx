import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { realtimeStore, realtimeContext } from './redux/realtimeStore'
import App from './components/App'
import * as engine from './engine/engine'
import {GlobalStyle} from './styles/GlobalStyle'
import Helmet from 'react-helmet';
import { createMuiTheme } from '@material-ui/core/styles';

import root from './util/prepareDOM'
import { CssBaseline, ThemeProvider } from '@material-ui/core'

engine.init(store, realtimeStore)

const theme = createMuiTheme({
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
          <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'" />
        </Helmet>
        <GlobalStyle />
        <App />
      </ThemeProvider>
    </Provider>
  </Provider> 
  , root
)