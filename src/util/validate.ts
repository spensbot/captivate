type MaybeError = string | void
type Validate<T> = (val: T) => MaybeError
type ValidatePkg<T> = { validate: Validate<T>, schema?: Schema<T> }
type SchemaNode<T> = { '***': ValidatePkg<T>[] }
type MakeSchemaNode<T> = (validate?: Validate<T>) => SchemaNode<T>
type ValidateSchemaResult<T> = {err?: any, fixed?: T }

export const string: MakeSchemaNode<string> = (validate) => {
  return {
    '***': [{
      validate: val => {
        if (typeof val !== 'string') return 'not a string'
        if (validate) return validate(val)
      }
    }]
  }
}

export const number: MakeSchemaNode<number> = (validate) => {
  return {
    '***': [{
      validate: val => {
        if (isNaN(val)) return 'not a number'
        if (validate) return validate(val)
      }
    }]
  }
}

export function nullable<T>(validate?: Validate<T>): SchemaNode<T> {
  return {
    '***': [{
      validate: val => {
        if (val === null) return
        if (validate) return validate(val)
      }
    }]
  }
}

export function union<T>(...validateList: SchemaNode<T>[]): SchemaNode<T> {
  return {
    '***': validateList.map(wrappedValidate => wrappedValidate["***"]).flat()
  }
}

export function object<T>(schema: Schema<T>, validate?: Validate<T>): SchemaNode<T> {
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

function isObject(val: any) {
  return val === Object(val);
}
function isArray(val: any) {
  return Array.isArray(val)
}

function ret<T>(fixed?: T, err?: Errors<T>) {
  return {
    fixed: fixed,
    err: err
  }
}

function clearArraysNested(array: any): any {
  if (isArray(array[0])) {
    return [clearArraysNested(array[0])]
  }
  return []
}

// OPTIONS
// val dne &
//   default exists -> {default, err}
//   default dne -> {_,_}
// Val is valid -> {val, _}
// Val is invalid &
//   default exists -> {default, err}
//   default dne -> {_, err}

function validatePrimitive<T>(validate: Validate<T>, defalt: T | undefined, val: any): ValidateSchemaResult<T> {
  if (validate(val)) {
    if (defalt === undefined) {
      return {err: validate(val)}
    } else {
      return {err: validate(val), fixed: defalt}
    }
  } else {
    return { fixed: val }
  }
}

function validatePackage<T>({schema, validate}: ValidatePkg<T>, defalt: T | undefined, val: any): ValidateSchemaResult<T> {
  if (val === undefined) {
    if (defalt === undefined) {
      return {}
    } else {
      return {err: 'Does not exist', fixed: defalt}
    }
  } else {
    if (schema === undefined) {
      return validatePrimitive(validate, defalt, val)
    } else {
      return validateSchema(schema, defalt, val)
    }
  }
}

function validateSchemaNode<T>(node: SchemaNode<T>, defalt: T | undefined, val: any): ValidateSchemaResult<T> {
  const pkgs = node["***"]

  if (pkgs.length < 1) {
    console.error('No schema node given!')
    return {fixed: defalt}
  } else if (pkgs.length > 1) {
    for (const pkg of pkgs) {
      const res = validatePackage(pkg, defalt, val)
      if (res.err === undefined)
        return {fixed: val}
    }
    return {err: `matched no union type`, fixed: defalt}
  } else {
    return validatePackage(pkgs[0], defalt, val)
  }
}

// OPTIONS
// The schema array should contain a single element. It can be one of the following
//  - SchemaNode
//  - Array
//  - Object
// Regardless, each value in the array should be checked for validity based on the schema type. 
//   Anything that is invalid should be fixed or replaced with the default.

function validateSchemaArray<T>(schemaArray: T[], defaltArray: T[] | undefined, valArray: any): ValidateSchemaResult<T[]> {
  const fixedArray: T[] = []
  const errArray: Errors<T>[] = []
  const defalt = defaltArray?.[0]

  if (valArray === undefined) return { fixed: defaltArray && clearArraysNested(defaltArray), err: 'does not exist'}
  // TODO: Make fixed array return correct number of nested arrays.
  if (!isArray(valArray)) return { fixed: defaltArray && clearArraysNested(defaltArray), err: 'is not array' }

  const schema = schemaArray[0]
  if (schema === undefined) {
    const err = 'Schema error!: All Arrays must have a single schema element'
    console.error(err)
    return {err: err, fixed: fixedArray}
  }

  const validateItem = isArray(schema)
    ? validateSchemaArray
    : (schema['***'] === undefined)
      ? validateSchema
      : validateSchemaNode

  valArray.forEach((val, i) => {
    const res = validateItem(schema, defalt, val)
    if (res.fixed !== undefined) fixedArray.push(res.fixed)
    if (res.err !== undefined) errArray[i] = res.err
  })

  return {fixed: fixedArray, err: errArray.length > 0 ? errArray : undefined}
}

function validateSchema<T>(schema: Schema<T>, defalt: T | undefined, obj: any): ValidateSchemaResult<T> {
  if (obj === undefined) return ret(defalt, 'does not exist')
  if (obj === null) return ret(defalt, 'is null')

  const fixed: Partial<T> = {}
  const errors: any = {}

  for (const key in schema) {
    const schemaVal = schema[key]
    const defaltVal = defalt?.[key]
    const val = obj[key]
    let res: ValidateSchemaResult<any> | null = null

    if (isArray(schemaVal)) {
      res = validateSchemaArray(schemaVal, defaltVal, val)

    } else if (isObject(schemaVal)) {
      if (schemaVal['***'] === undefined) {
        res = validateSchema(schemaVal, defaltVal, val)
      }
      else {
        res = validateSchemaNode(schemaVal, defaltVal, val)
      }
    }

    if (res === null) {
      console.error('res === null')
    } else {
      if (res.err !== undefined) {
        errors[key] = res.err
      }
      if (res.fixed !== undefined) {
        fixed[key] = res.fixed
      }
    }
  }

  return {fixed: fixed as T, err: Object.keys(errors).length === 0 ? undefined : errors}
}

export function makeValidate<T>(schema: Schema<T>, makeDefalt: () => T): (val: any) => ValidateSchemaResult<T> {
  return val => validateSchema(schema, makeDefalt(), val)
}

type Required_Recursive<T> = {
  [Key in keyof T]-?: Required_Recursive<T[Key]>
};
type Optional_Recursive<T> = {
  [Key in keyof T]+?: Optional_Recursive<T[Key]>
}

type SchemaFromRequired<T> = {
  [Key in keyof T]: T[Key] extends string | number | boolean
    ? SchemaNode<T[Key]>
    : SchemaFromRequired<T[Key]> | SchemaNode<T[Key]>
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