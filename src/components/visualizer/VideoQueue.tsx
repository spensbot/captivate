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

function load(path: string) {
  return (video: Video_t) => {
    video.element.src = "file://" + path
  }
}

export function loadVideo(src: string) {
  videoQueue.loadBackground(load(src))
}

const sources = [
  "file:///Users/Spenser/Movies/videos/sailing.mp4",
  "file:///Users/Spenser/Movies/videos/space.mp4",
]

loadVideo(sources[0])
videoQueue.getNext()
loadVideo(sources[1])