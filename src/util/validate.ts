type MaybeError = string | void
type Validate<T> = (val: T) => MaybeError
type Node<T> = { validate: Validate<T>, schema?: Schema<T> }
type WrappedValidate<T> = { '***': Node<T>[] }
type WrapValidate<T> = (validate?: Validate<T>) => WrappedValidate<T>
type ValidateSchemaResult<T> = {err?: any, fixed: T }

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

function ret<T>(fixed: T, err?: Errors<T>) {
  return {
    fixed: fixed,
    err: err
  }
}

function validateSchemaNodes<T>(nodes: Node<T>[], defalt: T, val: any): ValidateSchemaResult<T> {
  if (nodes.length < 1) {
    console.error('No schema node given!')
    return {fixed: defalt}
  } else if (nodes.length > 1) {
    for (const node of nodes) {
      const res = validateSchemaNode(node, defalt, val)
      if (res.err === undefined)
        return {fixed: val}
    }
    return {err: `matched no variant type`, fixed: defalt}
  } else {
    return validateSchemaNode(nodes[0], defalt, val)
  }
}

function validateSchemaNode<T>({validate, schema}: Node<T>, defalt: T, val: any): ValidateSchemaResult<T> {
  if (val === undefined) {
    if (defalt !== undefined) {
      return {err: 'Does not exist', fixed: defalt}
    } else {
      // TODO: This probably isn't right
      return {fixed: val}
    }
  } else {
    if (schema === undefined) {
      if (validate(val)) {
        return {err: validate(val), fixed: defalt}
      } else {
        return { fixed: val }
      }
    } else {
      return validateSchema(schema, defalt)(val)
    }
  }
}

function validateSchemaArray<T>(schemaArray: T[], defalt: T, val: any): ValidateSchemaResult<T> {
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
  //         fixed[key][i] = defalts[key][i]
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
  return {fixed: defalt}
}

export function validateSchema<T>(schema: Schema<T>, defalt: T): (obj: any) => ValidateSchemaResult<T> {
  return obj => {

    if (obj === undefined) return ret(defalt, 'is undefined')
    if (obj === null) return ret(defalt, 'is null')

    const fixed: Partial<T> = {}
    const errors: any = {}

    for (const key in schema) {
      const schemaVal = schema[key]
      const defaltVal = defalt[key]
      const val = obj[key]
      let res: ValidateSchemaResult<any> | null = null

      if (isArray(schemaVal)) {
        res = validateSchemaArray(schemaVal, defaltVal, val)

      } else if (isObject(schemaVal)) {
        if (schemaVal['***'] === undefined) {
          res = validateSchema(schemaVal, defaltVal)(val)
        }
        else {
          res = validateSchemaNodes(schemaVal['***'], defaltVal, val)
        }
      }

      if (res === null) {
        console.error('res === null')
      } else {
        if (res.err !== undefined) {
          errors[key] = res.err
        }
        fixed[key] = res.fixed
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
    : SchemaFromRequired<T[Key]> | WrappedValidate<T[Key]>
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