type MaybeError = string | void
type Validate<T> = (val: T) => MaybeError
// type WrappedValidate<T> = ['***', Validate<T>]
type WrappedValidate<T> = { '***': Validate<T>, def?: T }
type WrapValidate<T> = (validate?: Validate<T>, def?: T) => WrappedValidate<T>

export const string: WrapValidate<string> = (validate, def) => {
  return {
    '***': val => {
      if (typeof val !== 'string') return 'not a string'
      if (validate) return validate(val)
    },
    def: def
  }
}

export const number: WrapValidate<number> = (validate, def) => {
  return {
    '***': val => {
      if (isNaN(val)) return 'not a number'
      if (validate) return validate(val)
    },
    def: def
  }
}

// type ValidateObject<T> = (schema: Schema<T>, defaults: T) => (obj: T) => {errors?: string[], valid: T}

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

export function validate<T>(schema: Schema<T>, defaults: T): (obj: any) => {errors?: any, fixed: T} {
  return obj => {

    if (obj === undefined) return ret(defaults, 'is undefined')
    if (obj === null) return ret(defaults, 'is null')

    const fixed: Partial<T> = {}
    const errors: any = {}

    for (const key in schema) {
      const schemaVal = schema[key]
      const defaultVal = defaults[key]
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
          const valSchema = schemaVal
          const res = validate(valSchema, defaultVal)(val)
          errors[key] = res.errors
          fixed[key] = res.fixed
        }
        
        // Primitive
        else { 
          const validatePrimitive = schemaVal['***']
          const def = schemaVal.def
          if (validatePrimitive(val)) {
            errors[key] = validatePrimitive(val)
            fixed[key] = defaults[key]
          } else {
            fixed[key] = defaults[key]
          }
        }
      }
    }

    return {fixed: fixed as T, errors: errors}
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
type Schema<T> = SchemaFromRequired<Required_Recursive<T>>

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