export default interface CustomPassShader<T> {
  uniforms: T
  vertexShader: string
  fragmentShader: string
}
