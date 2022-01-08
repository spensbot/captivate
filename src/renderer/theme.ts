// import original module declarations
import 'styled-components'

export type ThemeType = 'light' | 'dark'

export function light() {
  return {
    colors: {
      bg: {
        primary: '#eee',
        darker: '#ddd',
        lighter: '#fff',
      },
      divider: '#777',
      text: {
        primary: '#111',
        secondary: '#777',
      },
    },
    spacing: (units: Number) => `${units}rem`,
  }
}

export type Theme_t = ReturnType<typeof light>

export function dark(): Theme_t {
  return {
    ...light(),
    colors: {
      bg: {
        primary: '#222',
        darker: '#111',
        lighter: '#333',
      },
      divider: '#777',
      text: {
        primary: '#eee',
        secondary: '#777',
      },
    },
  }
}

declare module 'styled-components' {
  export interface DefaultTheme extends Theme_t {}
}
