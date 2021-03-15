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
  return {
    element: element
  }
})

const sources = [
  "file:///Users/Spenser/Movies/videos/Pexels Videos 4708.mp4",
  "file:///Users/Spenser/Movies/videos/Pexels Videos 1851190.mp4"
]

function loadVideo(src: string) {
  return (video: Video_t) => {
    video.element.src = src
  }
}

videoQueue.loadBackground(loadVideo(sources[0]))
videoQueue.getNext()
videoQueue.loadBackground(loadVideo(sources[0]))
