import { _decorator, Component, Node } from 'cc';
import { DepthBufferStage } from './depth-buffer-stage';
const { ccclass, executeInEditMode, property } = _decorator;

@ccclass('DepthBufferObject')
@executeInEditMode
export class DepthBufferObject extends Component {
    onEnable () {
        if (DepthBufferStage.instance) {
            DepthBufferStage.instance.addObject(this);
        }
    }
    onDisable () {
        if (DepthBufferStage.instance) {
            DepthBufferStage.instance.removeObject(this);
        }
    }
}
