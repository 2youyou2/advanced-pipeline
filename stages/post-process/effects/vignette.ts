import { Color, _decorator } from 'cc';
import { cce } from '../../../utils/editor';
import { PostEffectBase, register } from '../post-effect-base';
const { property, ccclass } = _decorator

@register
@ccclass('VignetteEffect')
export class VignetteEffect extends PostEffectBase {
    static effectName = 'vignette';

    @property
    _radius = 1;
    @property
    get radius () {
        return this._radius;
    }
    set radius (v) {
        this._radius = v;
        this._updateProperty('radius', v);
    }

    @property
    _smoothness = 0.3;
    @property
    get smoothness () {
        return this._smoothness;
    }
    set smoothness (v) {
        this._smoothness = v;
        this._updateProperty('smoothness', v);
    }

    @property
    _intensity = 1.0;
    @property
    get intensity () {
        return this._intensity;
    }
    set intensity (v) {
        this._intensity = v;
        this._updateProperty('intensity', v);
    }

    @property
    _color = Color.BLACK.clone();
    @property
    get color () {
        return this._color;
    }
    set color (v) {
        this._color.set(v);
        this._updateProperty('color', v);
    }
}
