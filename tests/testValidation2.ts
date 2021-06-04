import { string, number, union, object, array, makeFix } from '../src/util/validate2'

interface Mixed {
  req: string,
  // opt: string
}
  
interface Test extends Mixed {
  string: string,
  number: number,
  object: Mixed,
  primitiveArray: number[],
  objectArray: Mixed[],
  // nestedArray: Mixed[][],
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
    // nestedArray: [[]]
  },
  testValidComplete: {
    string: 'a',
    number: 0,
    req: 'a',
    // opt: 'a',
    object: {
      req: 'a',
      // opt: 'a'
    },
    primitiveArray: [0, 1, 2, 3],
    objectArray: [{
      req: 'a',
      // opt: 'a'
    }],
    // nestedArray: [
    //   [{ req: 'a' }]
    // ]
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
    // nestedArray: [[{ req: 'a'}, {req: 'a', opt: 'b'}, 1, "hello"]]
  },
  testInvalidIncomplete: {

  },
}

const mixedSchema = object({
  req: string()
})

const fixTest = makeFix<Test>(object({
  string: string(),
  number: number(),
  req: string(),
  object: object({
    req: string()
  }),
  primitiveArray: array(number()),
  objectArray: array(mixedSchema)
}), () => ({
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
  console.log(fixTest(tests[testKey]))
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

const fixTest2 = makeFix<Test2>(object({
  nullable: union(null, mixedSchema),
  union: union(mixedSchema, object({ hello: number() })),
  primitiveUnionArray: array(union(number(), string(), null))
}), () => ({
  nullable: null,
  union: { hello: 0 },
  primitiveUnionArray: []
}))

export default () => {
  test('testValidMinimum')
  test('testValidComplete')
  test('testInvalidComplete')
  test('testInvalidIncomplete')
  console.log('test2')
  console.log(fixTest2(test2))
  console.log('test2Invalid')
  console.log(fixTest2(test2Invalid))
}
