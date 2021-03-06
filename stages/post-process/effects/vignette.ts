import { Color, _decorator } from 'cc';
import { PostEffectBase, effect, effectProperty } from '../post-effect-base';
const { property, ccclass } = _decorator

@effect
@ccclass('VignetteEffect')
export class VignetteEffect extends PostEffectBase {
    static effectName = 'vignette';

    @property
    @effectProperty
    _radius = 1;

    @property
    @effectProperty
    _smoothness = 0.3;

    @property
    @effectProperty
    _intensity = 1.0;

    @property
    @effectProperty
    _color = Color.BLACK.clone();
}
