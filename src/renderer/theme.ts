// import original module declarations
import 'styled-components'
import type { ThemePackId } from '../shared/appSettings'

export type ThemeType = 'light' | 'dark'

export function light() {
  return {
    colors: {
      bg: {
        primary: '#eee',
        darker: '#ddd',
        lighter: '#fff',
        panel: '#f4f4f4',
        raised: '#fafafa',
      },
      divider: '#8a8a8a',
      text: {
        primary: '#141414',
        secondary: '#2e2e2e',
        error: '#8b1a1a',
        warning: '#7a5a00',
      },
      icon: {
        primary: 'rgba(0, 0, 0, 0.84)',
        secondary: 'rgba(0, 0, 0, 0.72)',
      },
      button: {
        text: '#141414',
        textMuted: '#262626',
        icon: 'rgba(0, 0, 0, 0.82)',
      },
    },
    font: {
      size: {
        h1: '1.4rem',
      },
    },
    spacing: (units: Number) => `${units}rem`,
    elevation: {
      shadowSm: '0 1px 2px rgba(0, 0, 0, 0.12), 0 2px 5px rgba(0, 0, 0, 0.08)',
      shadowMd: '0 4px 14px rgba(0, 0, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.1)',
      shadowSidebar: '3px 0 16px rgba(0, 0, 0, 0.12)',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.65)',
      insetDepth: 'inset 0 2px 5px rgba(0, 0, 0, 0.12)',
    },
  }
}

export type Theme_t = ReturnType<typeof light>

export function dark(): Theme_t {
  return {
    ...light(),
    colors: {
      bg: {
        primary: 'hsl(0, 0%, 12%)',
        darker: 'hsl(0, 0%, 8%)',
        lighter: 'hsl(0, 0%, 17%)',
        panel: 'hsl(0, 0%, 20%)',
        raised: 'hsl(0, 0%, 23%)',
      },
      divider: '#555',
      text: {
        primary: '#f2f2f2',
        secondary: '#d2d2d2',
        error: '#f88',
        warning: '#ff8',
      },
      icon: {
        primary: 'rgba(255, 255, 255, 0.94)',
        secondary: 'rgba(255, 255, 255, 0.84)',
      },
      button: {
        text: 'rgba(255, 255, 255, 0.94)',
        textMuted: 'rgba(255, 255, 255, 0.86)',
        icon: 'rgba(255, 255, 255, 0.9)',
      },
    },
    elevation: {
      shadowSm: '0 1px 2px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.35)',
      shadowMd: '0 5px 16px rgba(0, 0, 0, 0.55), 0 2px 4px rgba(0, 0, 0, 0.4)',
      shadowSidebar: '4px 0 20px rgba(0, 0, 0, 0.5)',
      insetHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      insetDepth: 'inset 0 2px 8px rgba(0, 0, 0, 0.45)',
    },
  }
}

export function resolveThemePack(themePackId: ThemePackId): Theme_t {
  return themePackId === 'light' ? light() : dark()
}

declare module 'styled-components' {
  export interface DefaultTheme extends Theme_t {}
}
