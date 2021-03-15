const COUNT = 2

type SetState = (state: 'play' | 'pause') => void

// Instantiates multiple objects
// Returns 1 at a time, allowing others to load in the background
export default class LoadQueue<Type> {
  private items: Type[]
  private setState?: SetState
  private current: number

  constructor(createElement: () => Type, setState?: SetState) {
    this.items = Array(COUNT).fill(0).map(_ => createElement())
    this.setState = setState
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
    console.log(loadIndex)
    console.log(this.items[loadIndex])
    load(this.items[loadIndex])
  }
}


// export default function makeBackgroundLoadable<ElementType> ( createElement: () => ElementType ) {
//   return Array(COUNT).map(_ => createElement())
// }

