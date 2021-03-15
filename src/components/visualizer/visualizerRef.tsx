import { setIn } from 'formik'
import {videoQueue} from '../visualizer/VideoQueue'

export const visualizerRef = document.createElement('div')
visualizerRef.id = 'visualizer'

let activeVideo = videoQueue.getNext().element

export function resizeVisualizer(width: number, height: number) {
  activeVideo.width = width
  activeVideo.height = height
}

setInterval(() => {
  visualizerRef.innerHTML = ''
  activeVideo = videoQueue.getNext().element
  visualizerRef.appendChild(activeVideo)
  activeVideo.play()
  
}, 1000)