const COUNT = 2

// Instantiates multiple objects
// Returns 1 at a time, allowing others to load in the background
export default class LoadQueue<Type> {
  items: Type[]
  current: number

  constructor(createElement: () => Type) {
    this.items = Array(COUNT).fill(0).map(_ => createElement())
    this.current = 0

    console.log(this.items)
  }

  // getCurrent() {
  //   return this.items[this.current]
  // }

  getNext() {
    this.current += 1
    this.current %= COUNT
    return this.items[this.current]
  }

  loadBackground(load: (item: Type) => void) {
    let loadIndex = this.current - 1
    if (loadIndex < 0) {
      loadIndex = COUNT - 1
    }
    load(this.items[loadIndex])
  }

  forEach(cb: (item: Type) => void) {
    this.items.forEach(cb)
  }
}


// export default function makeBackgroundLoadable<ElementType> ( createElement: () => ElementType ) {
//   return Array(COUNT).map(_ => createElement())
// }

