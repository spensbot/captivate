export interface AboutDependencyInfo {
  name: string
  version: string
  url: string
  license: string
}

export interface AboutLinkInfo {
  label: string
  url: string
}

export interface AppAboutInfo {
  appName: string
  appVersion: string
  description: string
  runtime: {
    electron: string
    chrome: string
    node: string
    v8: string
  }
  links: AboutLinkInfo[]
  dependencies: AboutDependencyInfo[]
  credits: {
    originalCreator: string
    contributors: string[]
  }
}
