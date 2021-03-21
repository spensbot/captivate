import * as videoQueue from './VideoQueue'
import { randomElement } from '../../util/helpers'
import { store } from '../../redux/store'
import { RealtimeState } from '../../redux/realtimeStore'
import * as threeJSQueue from './ThreeJSQueue'
import { ipcRenderer } from 'electron'

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

const gltfModelFolders = [
  'fantasy_sky_background',
  'che',
  'croissant',
  'fantasy_sky_background',
  'ftm',
  'hand_low_poly',
  'low-poly_truck_car_drifter',
  'need_some_space',
  'old_rusty_car',
  'phoenix_bird',
  'ship_in_clouds',
  'skull_salazar_downloadable',
  'st_happens',
  'wolf_with_animations'
]

function getModelPath(folderName: string) {
  return `/Users/Spenser/Documents/Models/${folderName}/scene.gltf`
}

export function next() {
  visualizerRef.innerHTML = ''
  const folder = gltfModelFolders[count % gltfModelFolders.length]
  console.log(folder)
  const modelPath = getModelPath(folder)
  threeJSQueue.loadModel(modelPath)
  visualizerRef.appendChild(threeJSQueue.getNext().renderer.domElement)
  // visualizerRef.appendChild(threeJSQueue.getNext().renderer.domElement)
  // threeJSQueue.loadCube()
  count++
}

// setInterval(() => {
//   visualizerRef.innerHTML = ''

//   if (count % max === 0) {
//     activeVideo = videoQueue.getNext().element
//     visualizerRef.appendChild(activeVideo)
//     activeVideo.play()
//     activeVideo.playbackRate = 1.0
//     videoQueue.loadBackground(randomElement(store.getState().gui.videos))
//   } else if (count % max === 1) {
//     visualizerRef.appendChild(threeJSQueue.getNext().renderer.domElement)
//     threeJSQueue.loadCube()
//   } else if (count % max === 2) {
//     visualizerRef.appendChild(threeJSQueue.getNext().renderer.domElement)
//     threeJSQueue.loadText("feel with me")
//   } else {
//     console.log("Black Screen")
//   }

//   count++
  
// }, 1000)