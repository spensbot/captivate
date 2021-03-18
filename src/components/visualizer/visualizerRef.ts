import * as videoQueue from './VideoQueue'
import { randomElement } from '../../util/helpers'
import { store } from '../../redux/store'
import { RealtimeState } from '../../redux/realtimeStore'
import * as threeJSQueue from './ThreeJSQueue'

export const visualizerRef = document.createElement('div')
visualizerRef.id = 'visualizer'

let activeVideo = videoQueue.getNext().element

let count = 0
const max = 4

export function resizeVisualizer(width: number, height: number) {
  videoQueue.resize(width, height)
  threeJSQueue.resize(width, height)
}

export function update(realtimeState: RealtimeState) {
  threeJSQueue.update(realtimeState)
}

setInterval(() => {
  visualizerRef.innerHTML = ''
  if (count % max === 0) {
    activeVideo = videoQueue.getNext().element
    visualizerRef.appendChild(activeVideo)
    activeVideo.play()
    activeVideo.playbackRate = 1.0
    videoQueue.loadBackground(randomElement(store.getState().gui.videos))
  } else if (count % max === 1) {
    visualizerRef.appendChild(threeJSQueue.getNext().renderer.domElement)
    threeJSQueue.loadCube()
  } else if (count % max === 2) {
    visualizerRef.appendChild(threeJSQueue.getNext().renderer.domElement)
    threeJSQueue.loadText("feel with me")
  } else {
    console.log("Black Screen")
  }

  count++
  
}, 1000)