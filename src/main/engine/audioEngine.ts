import NodeAudio from 'node-audio'

const _nodeAudio = new NodeAudio()
_nodeAudio.connect(null)

setInterval(() => {
  console.log(_nodeAudio.getConnectionState().connected)
  console.log(_nodeAudio.getSessionState())
}, 1000)
