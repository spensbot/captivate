import NodeLink from 'node-link'

let _nodeLink = new NodeLink()

export function maintain() {
  setInterval(() => {
    let info = _nodeLink.getSessionInfoCurrent()
    console.log(`node-link  ==>  beats:${info.beats}  |  bpm:${info.bpm}`)
  }, 3000)
}
