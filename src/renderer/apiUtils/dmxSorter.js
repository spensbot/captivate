import { store } from 'renderer/redux/store'
import {
  setPageIndex,
  setChannelsPerPage,
  clearOverwrites,
  setOverwrite,
} from 'renderer/redux/mixerSlice'
export const dmxSorter = (target, data) => {
  switch (target) {
    case 'pageIndex': {
      store.dispatch(setPageIndex(data.value - 1))
    }
    case 'channelsPerPage': {
      store.dispatch(setChannelsPerPage(data.value))
    }
    case 'clearOverwrites': {
      store.dispatch(clearOverwrites())
    }
    case 'overwrite': {
      store.dispatch(setOverwrite({ index: data.index - 1, value: data.value }))
    }
    default: {
      throw Error('Invalid property.')
    }
  }
}
