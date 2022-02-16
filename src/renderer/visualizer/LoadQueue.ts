interface Loading<T> {
  state: 'loading'
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

  getNext(): T | null {
    let i = 0
    for (const loadable of this.queue) {
      if (i !== this.currentIndex && loadable.state === 'ready') {
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
        this.queue[index] = {
          state: 'ready',
          data,
        }
        if (this.onFirstLoad !== null) {
          this.currentIndex = index
          this.onFirstLoad(data)
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

  release() {
    this.queue.forEach((loadable) => {
      if (loadable.state === 'ready') {
        this.releaseItem(loadable.data)
      }
    })
  }
}
