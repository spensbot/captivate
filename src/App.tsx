import React from 'react'
import { render } from 'react-dom'
import { GlobalStyle } from './styles/GlobalStyle'
import { Provider } from 'react-redux'
import store from './redux/store'
import Greetings from './components/Greetings'

// import { useSelector, useDispatch } from 'react-redux'

const mainElement = document.createElement('div')
mainElement.setAttribute('id', 'root')
document.body.appendChild(mainElement)

import './serial'

const App = () => {
  return (
    <>
      <GlobalStyle />
      <Greetings />
      <h1>Hello Earthlings</h1>
    </>
  )
}

render(
  <Provider store={store}>
    <App />
  </Provider> 
  , mainElement
)
