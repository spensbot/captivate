import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import store from './redux/store'
import Home from './components/Home'
import * as engine from './engine/engine'

// import { useSelector, useDispatch } from 'react-redux'

const mainElement = document.createElement('div')
mainElement.setAttribute('id', 'root')
document.body.appendChild(mainElement)

const contentSecurityPolicy = document.createElement('meta')
contentSecurityPolicy.setAttribute('http-equiv', 'Content-Security-Policy')
contentSecurityPolicy.setAttribute('content', "default-src 'self'")
document.head.appendChild(contentSecurityPolicy)

engine.init(store)

render(
  <Provider store={store}>
    <Home />
  </Provider> 
  , mainElement
)
