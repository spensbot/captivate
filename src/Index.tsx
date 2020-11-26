import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import store from './redux/store'
import App from './components/App'
import * as engine from './engine/engine'
import {GlobalStyle} from './styles/GlobalStyle'

import root from './util/prepareDOM'

engine.init(store)

render(
  <Provider store={store}>
    <GlobalStyle />
    <App />
  </Provider> 
  , root
)
