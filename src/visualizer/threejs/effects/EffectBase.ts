import UpdateResource from '../UpdateResource'

export default abstract class EffectBase {
  update(_dt: number, _res: UpdateResource) {}
  resize(_width: number, _height: number) {}
  dispose() {}
}
