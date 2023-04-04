export const animationLoop = (cb: () => void) => {
  const loop = () => {
    cb()
    requestAnimationFrame(loop)
  }
  loop()
}
