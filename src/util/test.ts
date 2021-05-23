testArray()



type TestType = { [key in keyof TestInterface]: number }

interface TestInterface {
  a: 1
  b: 2
  c: 3
}

function runInterfaceVsType() {
  const testType: TestType = {
    a: 1,
    b: 2,
    c: 3
  }

  const testInterface: TestInterface = {
    a: 1,
    b: 2,
    c: 3
  }
}

function testArray() {
  const array = []
  array[10] = 10
  array[15] = 15
  array[-1] = -1
  array[0] = 0
  delete array[15]

  console.log('LOGGING VALUES')

  array.forEach((val, index) => console.log(`[${index}] -> ${val}`))
}