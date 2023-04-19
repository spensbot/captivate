import particleVertex from '../shaders/particles.vert';
import particleFragment from '../shaders/particles.frag';

export default {
  particles: {
    vertex: particleVertex,
    fragment: particleFragment,
  },
};
