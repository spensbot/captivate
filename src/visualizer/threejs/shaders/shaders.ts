//@ts-ignore
import particleVertex from '../shaders/particles.vert'
//@ts-ignore
import particleFragment from '../shaders/particles.frag'

export default {
  particles: {
    vertex: particleVertex,
    fragment: particleFragment,
  },
}
