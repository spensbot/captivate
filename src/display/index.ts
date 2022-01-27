import VisualizerManager, {
  VisualizerState,
} from '../renderer/visualizer/VisualizerManager'
import { ipcSetup } from './ipcHandler'

const vm = new VisualizerManager()
let visualizerState: VisualizerState | null = null
let lastUpdateTime: number | null = null

ipcSetup({
  onNewVisualizerState: (newState) => {
    visualizerState = newState
  },
})

document.body.appendChild(vm.getElement())

window.onresize = () => {
  vm.resize(window.innerWidth, window.innerHeight)
}

function animate() {
  if (visualizerState) {
    const now = Date.now()
    let dt = 0
    if (lastUpdateTime !== null) {
      dt = now - lastUpdateTime
    }
    lastUpdateTime = now
    vm.update(dt, visualizerState)
  }
  requestAnimationFrame(animate)
}

animate()
