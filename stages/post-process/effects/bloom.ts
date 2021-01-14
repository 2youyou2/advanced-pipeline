import { Color, _decorator } from 'cc';
import { PostEffectBase, effect, PassDefine, effectProperty } from '../post-effect-base';
const { property, ccclass } = _decorator

let bloomDefines = new Map()
bloomDefines.set(1, new PassDefine('pe_custom_texture_1'))
bloomDefines.set(2, new PassDefine('', ['pe_custom_texture_1']))

@effect
@ccclass('BloomEffect')
export class BloomEffect extends PostEffectBase {
    static effectName = 'bloom';
    static passDefines = bloomDefines;

    @property
    @effectProperty
    _threshold = 0.5;

    @property
    @effectProperty
    _softKnee = 0.5;

    @property
    @effectProperty
    _sampleScale = 1
}
