import { Color, _decorator } from 'cc';
import { PostEffectBase, register } from '../post-effect-base';
const { property, ccclass } = _decorator

@register
@ccclass('TonemapEffect')
export class TonemapEffect extends PostEffectBase {
    static effectName = 'tonemap';
}
