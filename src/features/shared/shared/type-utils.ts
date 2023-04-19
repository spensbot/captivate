export type Pretty<T> = T extends object
  ? {} & {
      [P in keyof T]: T[P]
    }
  : T
