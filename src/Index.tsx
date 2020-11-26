import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import store from './redux/store'
import App from './components/App'
import * as engine from './engine/engine'
import {GlobalStyle} from './styles/GlobalStyle'
import Helmet from 'react-helmet';

import root from './util/prepareDOM'

engine.init(store)

render(
  <Provider store={store}>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Captivate - Lighting and Visual Synth</title>
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'" />
      </Helmet>
    <GlobalStyle />
    <App />
  </Provider> 
  , root
)