import './3rd-party/initFirebase'
import '../features/logging/react/initErrorLogging'
import { render } from 'react-dom'
import GlobalStyle from './GlobalStyle'
import App from './App'
import { CaptivateThemeProvider } from '../features/ui/react/theme'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { realtimeStore, realtimeContext } from './redux/realtimeStore'

import * as api from './api'

api.subscriptions.subcribe({ store })

render(
  <Provider store={store}>
    <Provider store={realtimeStore} context={realtimeContext}>
      <CaptivateThemeProvider>
        <GlobalStyle />
        <App />
      </CaptivateThemeProvider>
    </Provider>
  </Provider>,
  document.getElementById('root')
)
