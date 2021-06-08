import {makeValidate, string, number, nullable, union, object, Schema} from '../src/util/validateOld'

interface Mixed { req: string, opt?: string }
const mixedSchema: Schema<Mixed> = {req: string(), opt: string()}
  
interface Test extends Mixed {
  string: string,
  number: number,
  object: Mixed,
  primitiveArray: number[],
  objectArray: Mixed[],
  nestedArray: Mixed[][],
}

const tests: { [key: string]: Test } = {
  testValidMinimum: {
    string: 'a',
    number: 0,
    req: 'a',
    object: {
      req: 'a'
    },
    primitiveArray: [],
    objectArray: [],
    nestedArray: [[]]
  },
  testValidComplete: {
    string: 'a',
    number: 0,
    req: 'a',
    opt: 'a',
    object: {
      req: 'a',
      opt: 'a'
    },
    primitiveArray: [0, 1, 2, 3],
    objectArray: [{ req: 'a', opt: 'a' }],
    nestedArray: [
      [{ req: 'a' }]
    ]
  },
  testInvalidComplete: {
    string: 2,
    number: 'a',
    req: 3,
    opt: 4,
    object: {
      req: true,
      opt: false
    },
    primitiveArray: ['a', [], null, undefined],
    objectArray: [1, 'b'],
    nestedArray: [[{ req: 'a'}, {req: 'a', opt: 'b'}, 1, "hello"]]
  },
  testInvalidIncomplete: {

  },
}

const validateTest = makeValidate<Test>({
  string: string(),
  number: number(),
  req: string(),
  opt: string(),
  object: {
    req: string(),
    opt: string()
  },
  primitiveArray: [number()],
  objectArray: [{ req: string(), opt: string() }],
  nestedArray: [[{
    req: string(),
    opt: string()
  }]]
}, () => ({
  string: 'a',
  number: 0,
  req: 'a',
  object: {
    req: 'a'
  },
  primitiveArray: [1],
  objectArray: [{ req: 'a' }],
  nestedArray: [[{ req: 'a' }]]
}))

function test(testKey: keyof typeof tests) {
  console.log(`Testing ${testKey}`)
  console.log(validateTest(tests[testKey]))
}

interface Test2 {
  nullable: null | Mixed,
  union: Mixed | { hello: number },
  primitiveUnionArray: Array<number | string | null>
}

const test2: Test2 = {
  nullable: null,
  union: { hello: 5 },
  primitiveUnionArray: [1, '2', null]
}

const test2Invalid: any = {
  nullable: 8,
  union: 'asdf',
  primitiveUnionArray: [[], {}, 1]
}

const validateTest2 = makeValidate<Test2>({
  nullable: union(nullable(), object(mixedSchema)),
  union: union(object(mixedSchema), object({hello: number()})),
  primitiveUnionArray: [union(number(), string(), nullable())]
}, () => ({
  nullable: null,
  union: { hello: 0 },
  primitiveUnionArray: 'okay'
}))

export default () => {
  test('testValidMinimum')
  test('testValidComplete')
  test('testInvalidComplete')
  test('testInvalidIncomplete')
  console.log('test2')
  console.log(validateTest2(test2))
  console.log('test2Invalid')
  console.log(validateTest2(test2Invalid))
}
