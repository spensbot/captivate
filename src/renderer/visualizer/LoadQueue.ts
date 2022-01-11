const COUNT = 2

// Instantiates multiple objects
// Returns 1 at a time, allowing others to load in the background
export default class LoadQueue<Type> {
  items: Type[]
  private active: number
  private bg: number

  constructor(createElement: () => Type) {
    this.items = Array(COUNT)
      .fill(0)
      .map((_) => createElement())
    this.active = 0
    this.bg = 1
  }

  next() {
    this.bg = this.active
    this.active += 1
    this.active %= COUNT
  }

  getActive() {
    return this.items[this.active]
  }

  getBackground() {
    return this.items[this.bg]
  }
}

// export default function makeBackgroundLoadable<ElementType> ( createElement: () => ElementType ) {
//   return Array(COUNT).map(_ => createElement())
// }
