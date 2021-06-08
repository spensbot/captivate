type MaybeError = string | void
type Validate<T> = (val: T) => MaybeError
interface NodeBase<T> { validate: Validate<T> }
interface NodePrimitive<T> extends NodeBase<T> { type: 'primitive' }
interface NodeArray<T> extends NodeBase<T> { type: 'array', fixItem: (val: any, defalt?: any) => Fixed<any> }
interface NodeObject<T> extends NodeBase<T> { type: 'object', schema: Schema<T> }
interface NodeUnion<T> { type: 'union', nodes: SchemaNode<T>[] }
interface NodeMap<T> extends NodeBase<T> { type: 'map', fixEntry: (val: any, defalt?: any) => Fixed<any> }
type SchemaNode<T> = NodePrimitive<T> | NodeArray<T> | NodeObject<T> | NodeUnion<T> | NodeMap<T>
type Fixed<T> = { err?: Errors<T>, fixed?: T }

type Errors<T> = {
  [Key in keyof T]+?: Errors<T[Key]>
} | string

// type Schema<T> = {
//   [Key in keyof T]-?: Required<T>[Key] extends Array<infer U>
//   ? NodeArray<U>
//   : SchemaNode<T>
// }

type Schema<T> = {
  [Key in keyof T]-?: SchemaNode<Required<T>[Key]>
}

// type Schema<T> = {
//   [Key in keyof T]-?: Required<T>[Key] extends Array<infer U>
//   ? NodeArray<U>
//   : Required<T>[Key] extends object
//   ? NodeObject<Required<T>[Key]>
//   : NodePrimitive<T> | NodeUnion<T>
// }

function optionalCheck<T>(val: any, defalt: T | undefined, res: Fixed<T>): Fixed<T> {
  if (defalt === undefined && val === undefined) return {}

  return res
}

function fixPrimitive<T>(node: NodePrimitive<T>, val: any, defalt?: T): Fixed<T> {
  const err = node.validate(val)
  if (err) {
    return optionalCheck(val, defalt, {
      err: err,
      fixed: defalt
    })
  } else {
    return {
      fixed: val
    }
  }
}

export function string(validate?: Validate<string>): SchemaNode<string> {
  return {
    type: 'primitive',
    validate: val => {
      if (typeof val !== 'string') return 'is not a string'
      if (validate) return validate(val)
    }
  }
}

export function number(validate?: Validate<number>): SchemaNode<number> {
  return {
    type: 'primitive',
    validate: val => {
      if (isNaN(val)) return 'not a number'
      if (validate) return validate(val)
    }
  }
}

export function boolean(validate?: Validate<boolean>): SchemaNode<boolean> {
  return {
    type: 'primitive',
    validate: val => {
      if (typeof val !== 'boolean') return 'not a boolean'
      if (validate) return validate(val)
    }
  }
}

export function equal<T>(comparator: T): SchemaNode<T> {
  return {
    type: 'primitive',
    validate: val => {
      if (val !== comparator) return `does not equal ${comparator}`
    }
  }
}

function fixObject<T>(node: NodeObject<T>, obj: any, defalt?: T): Fixed<T> {
  const err: Errors<T> = {}
  const fixed: Partial<T> = {}

  const objectErr = node.validate(obj)
  if (objectErr) return optionalCheck(obj, defalt, {
    err: objectErr,
    fixed: defalt
  })

  objectForEach(node.schema, (key, schemaVal) => {
    const defaltVal = defalt?.[key]
    const val = obj?.[key]
    const res = fix(schemaVal, val, defaltVal)
    if (res.err === undefined) {
      fixed[key] = val
    } else {
      err[key] = res.err
      if (res.fixed !== undefined) fixed[key] = res.fixed
    }
  })

  return {
    fixed: fixed as T,
    err: Object.keys(err).length === 0 ? undefined : err
  }
}

export function object<T>(schema: Schema<T>, validate?: Validate<T>): SchemaNode<T> {
  return {
    type: 'object',
    validate: val => {
      if (val === null) return 'is null'
      if (Array.isArray(val)) return 'is array'
      if (typeof val !== 'object') return `is ${typeof val}`
      if (validate) return validate(val)
    },
    schema: schema
  }
}

// Array defaults to [].
function fixArray<T>(node: NodeArray<T>, array: any, defalt?: T): Fixed<T[]> {
  const arrayErr = node.validate(array)
  if (arrayErr) return {
    err: arrayErr,
    fixed: []
  }

  const err: Errors<T>[] = []
  const fixed: T[] = []

  array.forEach((item: any, i: number) => {
    const res = node.fixItem(item, defalt)
    if (res.err === undefined) {
      fixed.push(item)
    } else {
      err[i] = res.err
    }
  })

  return {
    fixed: fixed,
    err: err.length > 0 ? err : undefined
  }
}

export function array<T>(itemNode: SchemaNode<T>, validateArray?: Validate<T[]>): SchemaNode<T[]> {
  return {
    type: 'array',
    validate: array => {
      if (!isArray(array)) return 'is not an array'
      if (validateArray) return validateArray(array)
    },
    fixItem: item => {
      return fix(itemNode, item)
    }
  }
}

export function fixMap<T>(node: NodeMap<T>, map: any, defalt?: T): Fixed<T> {
  const mapErr = node.validate(map)
  if (mapErr) return {
    err: mapErr,
    fixed: {} as T
  }

  const err: Errors<T> = {}
  const fixed: Partial<T> = {}

  objectForEach(map, (key, val) => {
    const res = node.fixEntry(val)
    if (res.err === undefined) {
      fixed[key] = val
    } else {
      err[key] = res.err
    }
  })

  return {
    fixed: fixed as T,
    err: Object.keys(err).length === 0 ? undefined : err
  }
}

export function map<T>(entryNode: SchemaNode<T>, validateMap?: Validate<{[key: string]: T}>): SchemaNode<{[key: string]: T}> {
  return {
    type: 'map',
    validate: map => {
      if (!isObject(map)) return 'is not an object'
      if (validateMap) return validateMap(map)
    },
    fixEntry: entry => {
      return fix(entryNode, entry)
    }
  }
}

function fixUnion<T>(node: NodeUnion<T>, val: any, defalt: any) {
  for (const subNode of node.nodes) {
    const res = fix(subNode, val, defalt)
    if (res.err === undefined) {
      return {
        fixed: val
      }
    }
  }

  return {
    err: 'does not match any union type',
    fixed: defalt
  }
}

export function union<T>(...validateList: (SchemaNode<any> | any)[]): SchemaNode<T> {
  return {
    type: 'union',
    nodes: validateList.map<SchemaNode<T>>(val => {
      if (isObject(val)) {
        if (val.validate === undefined) {
          console.error(`Bad value passed to union(). Primitive or SchemaNode required`)
        } else {
          return val
        }
      } else {
        return equal(val)
      }
    })
  }
}

function fix<T>(node: SchemaNode<T>, val: any, defalt?: T): Fixed<T> {
  if (node === undefined) {
    console.error('validate.ts:237 -> node === undefined')
  }
  if (node.type === 'union') return fixUnion(node, val, defalt)
  if (node.type === 'primitive') return fixPrimitive(node, val, defalt)
  if (node.type === 'array') return fixArray(node, val, defalt?.[0])
  if (node.type === 'object') return fixObject(node, val, defalt)
  if (node.type === 'map') return fixMap(node, val, defalt['default'])
  return {}
}

export function makeFix<T>(node: SchemaNode<T>, makeDefault: () => T): (val: any) => Fixed<T> {
  return val => fix(node, val, makeDefault())
}






function objectForEach<T>(obj: T, cb: (key: keyof T, val: T[typeof key]) => void) {
  for (const key in obj) {
    cb(key, obj[key])
  }
}

function isObject(val: any) {
  return val === Object(val);
}

function isArray(val: any) {
  return Array.isArray(val)
}