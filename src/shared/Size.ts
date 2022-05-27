export interface Size {
  width: number
  height: number
}
export function defaultSize(): Size {
  return {
    width: 0,
    height: 0,
  }
}
export function ar(size: Size) {
  return size.width / size.height
}
export function fit(content: Size, container: Size): Size {
  if (ar(content) > ar(container)) {
    // Too Wide
    return {
      width: container.width,
      height: container.width / ar(content),
    }
  } else {
    // Too Tall
    return {
      height: container.height,
      width: container.height * ar(content),
    }
  }
}
export function cover(content: Size, container: Size): Size {
  if (ar(content) > ar(container)) {
    // Too Wide
    return {
      height: container.height,
      width: container.height * ar(content),
    }
  } else {
    // Too Tall
    return {
      width: container.width,
      height: container.width / ar(content),
    }
  }
}
