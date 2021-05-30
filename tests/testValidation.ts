import {makeValidate, string, number, nullable, variant, object} from '../src/util/validate'

interface Mixed { req: string, opt?: string }

interface Test extends Mixed {
  string: string,
  number: number,
  object: Mixed,
  primitiveArray: number[],
  objectArray: Mixed[],
  nestedArray: Mixed[][]
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
    primitiveArray: [0, 1, 2, 3],
    objectArray: [{ req: 'a', opt: 'a' }],
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

export default () => {
  test('testValidMinimum')
  test('testValidComplete')
  test('testInvalidComplete')
  test('testInvalidIncomplete')
}
