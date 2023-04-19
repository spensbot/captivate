type Styles = Record<string, string>

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.scss' {
  const content: Styles
  export default content
}

declare module '*.sass' {
  const content: Styles
  export default content
}

declare module '*.css' {
  const content: Styles
  export default content
}

declare module '*.frag' {
  const content: string
  export default content
}

declare module '*.vert' {
  const content: string
  export default content
}

declare module '*.txt' {
  const content: string
  export default content
}

declare module '*.db' {
  const content: string
  export default content
}
