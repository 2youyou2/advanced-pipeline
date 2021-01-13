import { Color, _decorator } from 'cc';
import { PostEffectBase, register, PassDefine } from '../post-effect-base';
const { property, ccclass } = _decorator

let bloomDefines = new Map()
bloomDefines.set(1, new PassDefine('pe_custom_texture_1'))
bloomDefines.set(2, new PassDefine('', ['pe_custom_texture_1']))

@register
@ccclass('BloomEffect')
export class BloomEffect extends PostEffectBase {
    static effectName = 'bloom';
    static passDefines = bloomDefines;

    @property
    _threshold = 0.5
    @property
    get threshold () {
        return this._threshold;
    }
    set threshold (v) {
        this._threshold = v;
        this._updateProperty('threshold', v);
    }

    @property
    _softKnee = 0.5
    @property
    get softKnee () {
        return this._softKnee;
    }
    set softKnee (v) {
        this._softKnee = v;
        this._updateProperty('softKnee', v);
    }

    @property
    _sampleScale = 1
    @property
    get sampleScale () {
        return this._sampleScale;
    }
    set sampleScale (v) {
        this._sampleScale = v;
        this._updateProperty('sampleScale', v);
    }
}
