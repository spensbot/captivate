import { Context } from './core'
import { mutations } from './mutations'
import { queries } from './queries'
import { publishers } from './subscriptions'

export const createApi = (context: Context) => {
  const events = {
    publishers: publishers(context),
    mutations: mutations(context),
    queries: queries(context),
  }
  return {
    ...events,
    dispose() {
      events.mutations.dispose()
      events.queries.dispose()
    },
  }
}

export type IPC_Callbacks = ReturnType<typeof createApi>
