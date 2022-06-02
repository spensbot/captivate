const addon = require('../build/Release/node-link-native')

class NodeLink {
  constructor() {
    this._addonInstance = new addon.NodeLink()
  }

  getSessionInfoCurrent() {
    return this._addonInstance.getSessionInfoCurrent()
  }

  enable(isEnable) {
    return this._addonInstance.enable(isEnable)
  }

  setTempo(newBpm) {
    return this._addonInstance.setTempo(newBpm)
  }

  setIsPlaying(isPlaying) {
    return this._addonInstance.setIsPlaying(isPlaying)
  }

  enableStartStopSync(isEnable) {
    return this._addonInstance.enable(isEnable)
  }

  // private members
  _addonInstance
}

module.exports = NodeLink
