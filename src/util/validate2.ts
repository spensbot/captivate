type MaybeError = string | void
type Validate<T> = (val: T) => MaybeError
interface NodeBase<T> { validate: Validate<T> }
interface NodePrimitive<T> extends NodeBase<T> { type: 'primitive' }
interface NodeArray<T> extends NodeBase<T> { type: 'array', fixItem: (val: any) => Fixed<any> }
interface NodeObject<T> extends NodeBase<T> { type: 'object', schema: Schema<T> }
interface NodeUnion { type: 'union', nodes: SchemaNode<any>[]}
type SchemaNode<T> = NodePrimitive<T> | NodeArray<T> | NodeObject<T> | NodeUnion
type Fixed<T> = { err?: Errors<T>, fixed?: T }

function fixPrimitive<T>(node: NodePrimitive<T>, val: any, defalt?: T): Fixed<T> {
  if (node.validate(val)) return {
    err: node.validate(val),
    fixed: defalt
  }
  return {
    fixed: val
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

  if (node.validate(obj)) return {
    err: node.validate(obj),
    fixed: defalt
  }

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

function fixArray<T>(node: NodeArray<T[]>, array: any): Fixed<T[]> {
  if (node.validate(array)) return {
    err: node.validate(array),
    fixed: []
  }

  const err: Errors<T>[] = []
  const fixed: T[] = []

  array.forEach((item, i) => {
    const res = node.fixItem(item)
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

export function array<T>(node: SchemaNode<T>, validate?: Validate<T[]>): SchemaNode<T[]> {
  return {
    type: 'array',
    validate: array => {
      if (!isArray(array)) return 'is not an array'
      if (validate) return validate(array)
    },
    fixItem: item => {
      return fix(node, item)
    }
  }
}

function fixUnion(node: NodeUnion, val: any, defalt: any) {
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

export function union(...validateList: (SchemaNode<any> | any)[]): SchemaNode<any>[] {
  return validateList.map<SchemaNode<any>>(val => {
    if (isObject(val)) {
      if (val.validate === undefined) {
        return equal(val)
      }
    } else {
      return val
    }
  })
}

type Errors<T> = {
  [Key in keyof T]+?: Errors<T[Key]>
} | string

type Schema<T> = {
  [Key in keyof T]-?: SchemaNode<Required<T>[Key]> | NodeUnion
}

function fix<T>(node: SchemaNode<T>, val: any, defalt?: T): Fixed<T> {
  if (node.type === 'union') return fixUnion(node, val, defalt)
  if (node.type === 'primitive') return fixPrimitive(node, val, defalt)
  if (node.type === 'array') return fixArray(node, val)
  if (node.type === 'object') return fixObject(node, val, defalt)
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

function clearArraysNested(array: any): any {
  if (isArray(array[0])) {
    return [clearArraysNested(array[0])]
  }
  return []
}
