import { _decorator, RenderFlow, renderer, ForwardStage, __private, ForwardPipeline, ForwardFlow, ShadowStage, GFXRect, RenderStage, Rect, GFXClearFlag, RenderPipeline } from "cc";
import { EDITOR } from 'cc/env';
import { DepthBufferStage } from './depth-buffer/depth-buffer-stage';
import { GrassBendRenderStage } from './grass/grass-bend-render-stage';
import { InstanceForwardStage } from './instance/instance-forward-stage';
import { InstanceShadowStage } from './instance/instance-shadow-stage';
import { PostProcessStage } from './post-process/post-process-stage';
const { ccclass, property } = _decorator;

@ccclass("AdvancedFlow")
export class AdvancedFlow extends ForwardFlow {
    _name = "AdvancedFlow";

    _depthStage: DepthBufferStage | undefined;
    _grassBendStage: GrassBendRenderStage | undefined;
    _instanceForwardStage: InstanceForwardStage | undefined;
    _postProcessStage: PostProcessStage | undefined;

    _oldViewPort = new Rect;

    constructor () {
        super();

        this._depthStage = new DepthBufferStage();
        this._grassBendStage = new GrassBendRenderStage();

        this._instanceForwardStage = new InstanceForwardStage();
        this._instanceForwardStage.initialize(ForwardStage.initInfo);

        this._postProcessStage = new PostProcessStage();

        this._stages.push(this._depthStage);
        this._stages.push(this._grassBendStage);
        this._stages.push(this._instanceForwardStage);
        this._stages.push(this._postProcessStage);
    }

    // public initialize (info: __private.cocos_core_pipeline_render_flow_IRenderFlowInfo): boolean {
    //     super.initialize(info);

    //     if (this._stages.length === 0) {
    //         this._depthStage = new DepthBufferStage();
    //         this._grassBendStage = new GrassBendRenderStage();
    //         this._instanceForwardStage = new InstanceForwardStage();
    //         this._postProcessStage = new PostProcessStage();

    //         this._stages.push(this._depthStage);
    //         this._stages.push(this._grassBendStage);
    //         this._stages.push(this._instanceForwardStage);
    //         this._stages.push(this._postProcessStage);
    //     }
    //     return true;
    // }

    public activate (pipeline: RenderPipeline) {
        this._stages.length = 0;

        this._stages.push(this._depthStage!);
        this._stages.push(this._grassBendStage!);
        this._stages.push(this._instanceForwardStage!);
        this._stages.push(this._postProcessStage!);

        super.activate(pipeline);
    }

    public render (camera: renderer.scene.Camera) {
        let hasRenderThings = Number(camera.visibility) !== 0;
        if (!hasRenderThings) {
            return;
        }

        // camera.update();

        const pipeline = this._pipeline as ForwardPipeline;
        super.sceneCulling(camera);
        pipeline.updateCameraUBO(camera);

        let postProcessStage = this._postProcessStage;
        if (!EDITOR || camera.node.name === 'Editor Camera') {
            this._depthStage?.render(camera);
            this._grassBendStage?.render(camera);

            if (postProcessStage && postProcessStage._renderCommands.length !== 0) {
                postProcessStage.oldCameraSetting.set(camera);
                postProcessStage.postProcessCameraSetting.setToCamera(camera);
            }
        }

        this._instanceForwardStage?.render(camera);

        if (!EDITOR || camera.node.name === 'Editor Camera') {
            if (postProcessStage && postProcessStage._renderCommands.length !== 0) {
                postProcessStage.render(camera);
            }
        }
    }

    rebuild () {

    }

    destroy () {

    }
}
