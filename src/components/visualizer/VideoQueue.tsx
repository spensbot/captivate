import LoadQueue from './LoadQueue'

type Video_t = {
  element: HTMLVideoElement
  bpm?: number // if specified. The video will speed-up as necessary to sync with program
}

export const videoQueue = new LoadQueue<Video_t>(() => {
  const element = document.createElement("video")
  element.autoplay = true
  element.loop = true
  element.muted = true
  element.playbackRate = 3.0
  element.className = "fullscreen-video"
  return {
    element: element
  }
})

export function getNext() {
  videoQueue.next()
  return videoQueue.getActive()
}

export function resize(width: number, height: number) {
  videoQueue.items.forEach(video => {
    video.element.width = width
    video.element.height = height
  })
}

export function loadBackground(path: string) {
  videoQueue.getBackground().element.src = 'file://' + path
}