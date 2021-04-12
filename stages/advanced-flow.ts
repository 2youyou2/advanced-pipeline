import { _decorator, RenderFlow, renderer, ForwardStage, __private, ForwardPipeline, ForwardFlow, ShadowStage, GFXRect, RenderStage, Rect, GFXClearFlag, RenderPipeline, geometry, Pool, pipeline, Vec3 } from "cc";
import { Camera } from "cc";
import { EDITOR } from 'cc/env';
import { AdvancedPipeline } from './advanced-pipeline';
import { DepthBufferStage } from './depth-buffer/depth-buffer-stage';
import { GrassBendRenderStage } from './grass/grass-bend-render-stage';
import { InstanceForwardStage } from './instance/instance-forward-stage';
import { InstanceShadowStage } from './instance/instance-shadow-stage';
import { PostProcessStage } from './post-process/post-process-stage';
const { ccclass, property } = _decorator;

let _tempVec3 = new Vec3
const roPool = new Pool<pipeline.IRenderObject>(() => ({ model: null!, depth: 0 }), 128);
function getRenderObject (model: renderer.scene.Model, camera: renderer.scene.Camera) {
    let depth = 0;
    if (model.node) {
        Vec3.subtract(_tempVec3, model.node.worldPosition, camera.position);
        depth = Vec3.dot(_tempVec3, camera.forward);
    }
    const ro = roPool.alloc();
    ro.model = model;
    ro.depth = depth;
    return ro;
}

export enum ClearFlag {
    NONE = 0,
    COLOR = 1,
    DEPTH = 2,
    STENCIL = 4,
    DEPTH_STENCIL = DEPTH | STENCIL,
    ALL = COLOR | DEPTH | STENCIL,
}
const SKYBOX_FLAG = ClearFlag.STENCIL << 1;


function sceneCulling (pipeline: ForwardPipeline, camera: renderer.scene.Camera) {
    const scene = camera.scene!;
    const models = scene.models;

    const renderObjects = pipeline.renderObjects;
    roPool.freeArray(renderObjects); renderObjects.length = 0;

    if (pipeline.skybox.enabled && pipeline.skybox.model && (camera.clearFlag & SKYBOX_FLAG)) {
        renderObjects.push(getRenderObject(pipeline.skybox.model, camera));
    }


    for (let i = 0; i < models.length; i++) {
        const model = models[i];

        // filter model by view visibility
        if (model.enabled) {
            if (model.node && ((camera.visibility & model.node.layer) === model.node.layer)
                || (camera.visibility & model.visFlags)) {
                // frustum culling
                if (model.worldBounds && !geometry.intersect.aabbFrustum(model.worldBounds, camera.frustum)) {
                    continue;
                }

                renderObjects.push(getRenderObject(model, camera));
            }
        }
    }
}

@ccclass("AdvancedFlow")
export class AdvancedFlow extends ForwardFlow {
    _name = "AdvancedFlow";

    _depthStage: DepthBufferStage | undefined;
    _grassBendStage: GrassBendRenderStage | undefined;
    _instanceForwardStage: InstanceForwardStage | undefined;
    _postProcessStage: PostProcessStage | undefined;

    _oldViewPort = new Rect;

    _clearFlag = 0;

    get depthStage () {
        return this.depthStage;
    }
    get grassBendStage () {
        return this.grassBendStage;
    }
    get instanceForwardStage () {
        return this._instanceForwardStage;
    }
    get postProcessStage () {
        return this._postProcessStage;
    }

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

        let oldClearFlag = camera.clearFlag;
        if (EDITOR) {
            if (camera.name === 'Editor Camera') {
                this._clearFlag = camera.clearFlag;
                return;
            }

            // TODO: hack
            if (camera.name === 'Editor UICamera') {
                camera.clearFlag = this._clearFlag;
            }
        }


        const pipeline = this._pipeline as AdvancedPipeline;
        // pipeline.updateCameraUBO(camera);

        // TODO: hack sceneCulling 
        // @ts-ignore
        if (super.sceneCulling) {
            // @ts-ignore
            super.sceneCulling(camera);
        }
        else {
            sceneCulling(pipeline, camera);
        }

        this._grassBendStage?.render(camera);

        let postProcessStage = this._postProcessStage!;
        let usePostProcess = pipeline.usePostProcess && postProcessStage && postProcessStage._renderCommands.length !== 0;
        if (!EDITOR || camera.name === 'Editor UICamera') {
            this._depthStage?.render(camera);

            if (usePostProcess) {
                postProcessStage.oldCameraSetting.set(camera);
                postProcessStage.postProcessCameraSetting.setToCamera(camera);
            }
        }

        this._instanceForwardStage?.render(camera);

        if (!EDITOR || camera.name === 'Editor UICamera') {
            if (usePostProcess) {
                postProcessStage.render(camera);
            }
        }

        if (EDITOR) {
            // TODO: hack
            if (camera.name === 'Editor UICamera') {
                camera.clearFlag = oldClearFlag;
            }
        }
    }

    rebuild () {

    }

    destroy () {

    }
}
