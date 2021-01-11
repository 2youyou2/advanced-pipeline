import { _decorator, RenderFlow, renderer, ForwardStage, __private, ForwardPipeline, ForwardFlow, ShadowStage, GFXRect, RenderStage, Rect, GFXClearFlag, RenderPipeline } from "cc";
import { DepthBufferStage } from './depth-buffer/depth-buffer-stage';
import { GrassBendRenderStage } from './grass/grass-bend-render-stage';
import { InstanceForwardStage } from './instance/instance-forward-stage';
import { InstanceShadowStage } from './instance/instance-shadow-stage';
import { PostProcessStage } from './post-process/post-process-stage';
const { ccclass, property } = _decorator;

@ccclass("AdvancedFlow")
export class AdvancedFlow extends ForwardFlow {
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

        const pipeline = this._pipeline as ForwardPipeline;
        super.sceneCulling(camera);
        pipeline.updateCameraUBO(camera);

        this._depthStage?.render(camera);
        this._grassBendStage?.render(camera);

        const window = camera.window! as any as __private.cocos_core_renderer_core_render_window_RenderWindow;
        let oldWindow = window;
        let oldClearDepth = camera.clearDepth;
        let oldClearStencil = camera.clearStencil;
        let oldClearFlag = camera.clearFlag;
        this._oldViewPort.set(camera.viewport);

        let postProcessStage = this._postProcessStage;
        if (postProcessStage) {
            if (postProcessStage._renderCommands.length !== 0) {
                camera.window = postProcessStage._originRenderTexture?.window as any;
                camera.viewport.set(0, 0, 1, 1);
                camera.clearDepth = 1;
                camera.clearStencil = 0;
                camera.clearFlag = GFXClearFlag.ALL;
            }
        }

        this._instanceShadowStage?.render(camera);
        this._instanceForwardStage?.render(camera);

        if (postProcessStage) {
            postProcessStage.render(camera);

            camera.window = oldWindow as any;
            camera.viewport.set(this._oldViewPort);
            camera.clearDepth = oldClearDepth;
            camera.clearStencil = oldClearStencil;
            camera.clearFlag = oldClearFlag;
        }

        // camera.update();

        // super.render(camera);
    }

    rebuild () {

    }

    destroy () {

    }
}
