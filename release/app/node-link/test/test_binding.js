const NodeLink = require('../dist/binding.js')
const assert = require('assert')

assert(NodeLink, 'The expected module is undefined')
const instance = new NodeLink()

instance.enable(true)
instance.enableStartStopSync(true)
instance.setIsPlaying(true)
instance.setTempo(123.45)

setInterval(() => {
  console.log(instance.getSessionInfoCurrent())
}, 1000)
