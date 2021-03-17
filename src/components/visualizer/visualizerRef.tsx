import { videoQueue, loadVideo } from '../visualizer/VideoQueue'
import { randomElement } from '../../util/helpers'
import { store } from '../../redux/store'

export const visualizerRef = document.createElement('div')
visualizerRef.id = 'visualizer'

let activeVideo = videoQueue.getNext().element

let count = 0
const max = 2

export function resizeVisualizer(width: number, height: number) {
  videoQueue.forEach(video => {
    video.element.width = width
    video.element.height = height
  })
}

console.log(`[0]: ${videoQueue.items[0].element.src}`)
console.log(`[1]: ${videoQueue.items[1].element.src}`)

setInterval(() => {
  visualizerRef.innerHTML = ''
  if (count % max === 0) {
    activeVideo = videoQueue.getNext().element
    visualizerRef.appendChild(activeVideo)
    activeVideo.play()
    activeVideo.playbackRate = 1.0
    loadVideo(randomElement(store.getState().gui.videos))
  } else if (count % max === 1) {
    console.log("Black screen")
  }

  count++
  
}, 1000)