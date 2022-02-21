interface Loading<T> {
  state: 'loading'
  canelled?: true
  promise: Promise<T>
}
interface Ready<T> {
  state: 'ready'
  data: T
}
type Loadable<T> = Loading<T> | Ready<T>

export default class LoadQueue<T> {
  private queue: Loadable<T>[]
  private currentIndex = 0
  private readonly releaseItem
  private onFirstLoad: null | ((t: T) => void)
  private loadNext: () => Promise<T>

  constructor(
    size: number,
    loadNext: () => Promise<T>,
    releaseItem: (item: T) => void,
    onFirstLoad: (t: T) => void
  ) {
    this.loadNext = loadNext
    this.releaseItem = releaseItem
    this.onFirstLoad = onFirstLoad

    this.queue = Array(size)
      .fill(0)
      .map((_, i) => this.loadNextAndBind(i))
  }

  reset(newLoadNext: () => Promise<T>, newOnFirstLoad: (t: T) => void) {
    const next = this.getNext()
    if (next === null) {
      this.onFirstLoad = newOnFirstLoad
    } else {
      newOnFirstLoad(next)
    }

    this.loadNext = newLoadNext
  }

  getNext(): T | null {
    let i = 0
    for (const loadable of this.queue) {
      if (i !== this.currentIndex && loadable.state === 'ready') {
        const currentItem = this.queue[this.currentIndex]
        if (currentItem.state === 'ready') {
          this.releaseItem(currentItem.data)
        }
        this.queue[this.currentIndex] = this.loadNextAndBind(this.currentIndex)
        this.currentIndex = i
        return loadable.data
      }
      i += 1
    }
    return null // <-- Nothing new has loaded
  }

  private loadNextAndBind(index: number): Loading<T> {
    const promise = this.loadNext()
    promise
      .then((data) => {
        const loadable = this.queue[index]
        if (loadable.state === 'loading' && loadable.canelled) return
        this.queue[index] = {
          state: 'ready',
          data,
        }
        if (this.onFirstLoad !== null) {
          this.currentIndex = index
          this.onFirstLoad(data)
          this.onFirstLoad = null
        }
      })
      .catch((err) => {
        console.error(`LoadQueue Load Error`, err)
        this.queue[index] = {
          state: 'loading',
          promise: this.loadNext(),
        }
      })
    return {
      state: 'loading',
      promise,
    }
  }

  dispose() {
    this.queue.forEach((loadable) => {
      if (loadable.state === 'ready') {
        this.releaseItem(loadable.data)
      } else {
        loadable.canelled = true
      }
    })
  }
}
