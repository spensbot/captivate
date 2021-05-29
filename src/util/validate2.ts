type MaybeError = string | void
type Validate<T> = (val: T) => MaybeError
type Node<T> = {
  validate: Validate<T>
  defalt?: T 
}
type WrappedValidate<T> = { '***': Node<T> }
type WrapValidate<T> = (validate?: Validate<T>) => WrappedValidate<T>

export const string: WrapValidate<string> = (validate?) => {
  return {
    '***': {
      validate: val => {
        if (typeof val !== 'string') return 'not a string'
        if (validate) return validate(val)
      }
    }
  }
}

type Required_Recursive<T> = {
  [Key in keyof T]-?: Required_Recursive<T[Key]>
}
type Optional_Recursive<T> = {
  [Key in keyof T]+?: Optional_Recursive<T[Key]>
}
type SchemaFromRequired<T> = {
  [Key in keyof T]: T[Key] extends string | number | boolean
    ? WrappedValidate<T[Key]>
    : SchemaFromRequired<T[Key]>
}
type Schema<T> = SchemaFromRequired<Required_Recursive<T>>
type Errors<T> = {
  [Key in keyof T]+?: T[Key] extends string | number | boolean
    ? string
    : Errors<T[Key]>
} | string