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
      divider: '#999',
      text: {
        primary: '#111',
        secondary: '#777',
      },
    },
    font: {
      size: {
        h1: '1.4rem',
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
        primary: 'hsl(0, 0%, 15%)',
        darker: 'hsl(0, 0%, 14%)',
        lighter: 'hsl(0, 0%, 20%)',
      },
      divider: '#555',
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
