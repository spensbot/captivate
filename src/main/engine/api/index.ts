import { Context } from './core'
import { mutations } from './mutations'
import { queries } from './queries'
import { publishers } from './subscriptions'

export const createApi = (context: Context) => {
  return {
    publishers: publishers(context),
    mutations: mutations(context),
    queries: queries(context),
  }
}

export type IPC_Callbacks = ReturnType<typeof createApi>
