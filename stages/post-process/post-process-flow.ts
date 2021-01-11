import { _decorator, RenderFlow, renderer } from "cc";
const { ccclass, property } = _decorator;

@ccclass("PostProcessFlow")
export class PostProcessFlow extends RenderFlow {

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    // public render (camera: renderer.scene.Camera) {

    //     camera.update();

    //     this._pipeline.sceneCulling(view);

    //     this._pipeline.updateUBOs(view);

    //     super.render(view);
    // }

    rebuild () {

    }

    destroy () {

    }
}
