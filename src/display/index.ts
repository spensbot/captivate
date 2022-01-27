import VisualizerManager, {
  VisualizerState,
} from '../renderer/visualizer/VisualizerManager'
import { ipcSetup } from './ipcHandler'

const vm = new VisualizerManager()
let visualizerState: VisualizerState | null = null

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
    vm.update(visualizerState)
  }
  requestAnimationFrame(animate)
}

animate()
