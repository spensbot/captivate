import { createQueries } from './core'
import * as fileApi from 'features/fileSaving/engine/api'

export const queries = createQueries([
  fileApi.load,
  fileApi.save,
  fileApi.getFilePaths,
])
