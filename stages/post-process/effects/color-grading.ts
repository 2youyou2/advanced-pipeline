import { Color, _decorator } from 'cc';
import { PostEffectBase, effect, effectProperty } from '../post-effect-base';
const { property, ccclass } = _decorator

@effect
@ccclass('ColorGradingEffect')
export class ColorGradingEffect extends PostEffectBase {
    static effectName = 'color-grading';

    @property
    @effectProperty
    _brightness = 1.0;

    @property
    @effectProperty
    _saturation = 1.0;

    @property
    @effectProperty
    _contrast = 1.0;
}
