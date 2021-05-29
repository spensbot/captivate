type MaybeError = string | void
type Validate<T> = (val: T) => MaybeError
type Node<T> = { validate: Validate<T>, schema?: Schema<T> }
type WrappedValidate<T> = { '***': Node<T>[] }
type WrapValidate<T> = (validate?: Validate<T>) => WrappedValidate<T>

export const string: WrapValidate<string> = (validate) => {
  return {
    '***': [{
      validate: val => {
        if (typeof val !== 'string') return 'not a string'
        if (validate) return validate(val)
      }
    }]
  }
}

export const number: WrapValidate<number> = (validate) => {
  return {
    '***': [{
      validate: val => {
        if (isNaN(val)) return 'not a number'
        if (validate) return validate(val)
      }
    }]
  }
}

export function nullable<T>(validate?: Validate<T>): WrappedValidate<T> {
  return {
    '***': [{
      validate: val => {
        if (val === null) return
        if (validate) return validate(val)
      }
    }]
  }
}

export function variant<T>(validateList: WrappedValidate<T>[]): WrappedValidate<T> {
  return {
    '***': validateList.map(wrappedValidate => wrappedValidate["***"]).flat()
  }
}

export function object<T>(schema: Schema<T>, validate?: Validate<T>): WrappedValidate<T> {
  return {
    '***': [{
      validate: val => {
        if (val === null) return 'is null'
        if (Array.isArray(val)) return 'is array'
        if (typeof val !== 'object') return `is ${typeof val}`
        if (validate) return validate(val)
      },
      schema: schema
    }]
  }
}

function isObject(obj: any) {
  return obj === Object(obj);
}
function isArray(obj: any) {
  return Array.isArray(obj)
}

function ret<T>(fixed: T, errors?: Errors<T>) {
  return {
    fixed: fixed,
    errors: errors
  }
}

export function validateSchema<T>(schema: Schema<T>, defalt: T): (obj: any) => {err?: any, fixed: T} {
  return obj => {

    if (obj === undefined) return ret(defalt, 'is undefined')
    if (obj === null) return ret(defalt, 'is null')

    const fixed: Partial<T> = {}
    const errors: any = {}

    for (const key in schema) {
      const schemaVal = schema[key]
      const defaultVal = defalt[key]
      const val = obj[key]

      // Array 
      if (isArray(schemaVal)) {
        // fixed[key] = []
        // if (!isArray(val)) {
        //   errors[key] = 'is not array'
        // } else {
        //   const schemaItem = schemaVal[0]
        //   if (schemaItem['***'] === undefined) { // Object
        //     const validateItem = schemaItem['***']
        //     val.forEach((item, i) => {
        //       if (validateItem(item)) {
        //         errors[key][i] = validateItem(item)
        //         fixed[key][i] = defaults[key][i]
        //       } else {
        //         fixed[key][i] = item
        //       }
        //     })
        //   } else {
        //     const itemSchema = schemaItem
        //     val.forEach((item, i) => {
        //       const {errors, fixed} = 
        //     })
        //   }
        // }

      // Object
      } else if (isObject(schemaVal)) {
        if (schemaVal['***'] === undefined) {
          const subSchema = schemaVal
          const res = validateSchema(subSchema, defaultVal)(val)
          if (res.errors !== undefined) {
            errors[key] = res.errors
          }
          fixed[key] = res.fixed
        }
        
        // Primitive
        else { 
          const validatePrimitive = schemaVal['***']
          if (val === undefined) {
            if (defaultVal !== undefined) {
              errors[key] = 'Does not exist'
              fixed[key] = defaultVal
            }
          } else {
            if (validatePrimitive(val)) {
              errors[key] = validatePrimitive(val)
              fixed[key] = defaultVal
            } else {
              fixed[key] = val
            }
          }
        }
      }
    }

    return {fixed: fixed as T, errors: Object.keys(errors).length === 0 ? undefined : errors}
  }
}


type Required_Recursive<T> = {
  [Key in keyof T]-?: Required_Recursive<T[Key]>
};
type Optional_Recursive<T> = {
  [Key in keyof T]+?: Optional_Recursive<T[Key]>
}

type SchemaFromRequired<T> = {
  [Key in keyof T]: T[Key] extends string | number | boolean
    ? WrappedValidate<T[Key]>
    : SchemaFromRequired<T[Key]>
}
export type Schema<T> = SchemaFromRequired<Required_Recursive<T>>

type Errors<T> = {
  [Key in keyof T]+?: T[Key] extends string | number | boolean
    ? string
    : Errors<T[Key]>
} | string














// type OptionalKeys<T> = { [K in keyof T]-?:
//   ({} extends { [P in K]: T[K] } ? K : never)
// }[keyof T]
// type RequiredKeys<T> = { [K in keyof T]-?:
//   ({} extends { [P in K]: T[K] } ? never : K)
// }[keyof T]
// type OptionalOnly<T> = Required<Pick<T, OptionalKeys<T>>>
// type RequiredOnly<T> = Pick<T, RequiredKeys<T>>