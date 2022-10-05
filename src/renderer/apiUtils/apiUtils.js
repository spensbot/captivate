import { store } from 'renderer/redux/store'

import { universeSorter } from './universeSorter'
import { modulationSorter } from './modulationSorter'
import { visualSorter } from './visualSorter'
import { dmxSorter } from './dmxSorter'
import { masterSorter } from './masterSorter'

export const getUtil = (target) => {
  let state = store.getState()

  target.forEach((el) => (state = state[el]))

  let final = state

  return final
}

export const putUtil = (target, id, data) => {
  if (target[0] === 'universe') {
    universeSorter(target[1], data)
  } else if (target[0] === 'dmxOut') {
    dmxSorter(target[1], data)
  } else if (target[0] === 'visualScenes') {
    visualSorter(target[1], data)
  } else if (target[0] === 'modulation') {
    modulationSorter(target[1], data)
  } else if (target[0] === 'master') {
    masterSorter(target[1], data)
  } else {
    throw Error('Invalid property/route.')
  }
}
