import { Color, _decorator } from 'cc';
import { PostEffectBase, effect } from '../post-effect-base';
const { property, ccclass } = _decorator

@effect
@ccclass('TonemapEffect')
export class TonemapEffect extends PostEffectBase {
    static effectName = 'tonemap';
}
