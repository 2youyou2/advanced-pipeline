import { _decorator, RenderStage, GFXRect, GFXColor, ForwardPipeline, ModelComponent, renderer, GFXLoadOp, GFXTextureLayout, GFXFilter, GFXAddress, RenderFlow, RenderPipeline, director, GFXBufferUsageBit, GFXMemoryUsageBit, GFXClearFlag, GFXCullMode, RenderTexture, GFXBufferInfo, GFXRenderPassInfo, GFXColorAttachment, GFXDepthStencilAttachment, Terrain, geometry } from "cc";
import { DepthBufferObject } from './depth-buffer-object';
import { UNIFORM_DEPTH_BUFFER_MAP_BINDING, UBOCustomCommon } from '../../defines/ubo';
import { commitBuffer } from "../../utils/stage";
import { getPhaseID, pipeline } from '../../defines/pipeline';
import { EDITOR } from 'cc/env';
import { Layers } from '../../defines/layer';

const { ccclass, type, property } = _decorator;
const { SetIndex } = pipeline;

const colors: GFXColor[] = [{ x: 1, y: 1, z: 1, w: 1 }];


const _colorAttachment = new GFXColorAttachment();
_colorAttachment.endLayout = GFXTextureLayout.SHADER_READONLY_OPTIMAL;
const _depthStencilAttachment = new GFXDepthStencilAttachment();
const _renderPassInfo = new GFXRenderPassInfo([_colorAttachment], _depthStencilAttachment);

const _phaseID = getPhaseID('depth-buffer');


@ccclass("DepthBufferStage")
export class DepthBufferStage extends RenderStage {
    static get instance (): DepthBufferStage | null {
        let flow = director.root!.pipeline.flows.find(f => f.name === 'ForwardFlow');
        if (!flow) return null;
        return flow.stages.find(s => s.name === 'DepthBufferStage') as DepthBufferStage;
    }

    _name = 'DepthBufferStage'

    private _renderTexture: RenderTexture | null = null;
    private _renderArea: GFXRect = { x: 0, y: 0, width: 0, height: 0 };

    protected _pipelineStates = { rasterizerState: { cullMode: GFXCullMode.BACK } };

    protected _buffer = new Float32Array(UBOCustomCommon.COUNT);


    depthBufferObjects: DepthBufferObject[] = [];

    @property
    enabled = true;

    activate (pipeline: RenderPipeline, flow: RenderFlow) {
        super.activate(pipeline, flow);

        this.bindUBO();
        this.updateUBO();
    }

    addObject (obj: DepthBufferObject) {
        this.depthBufferObjects.push(obj);
    }

    removeObject (obj: DepthBufferObject) {
        let index = this.depthBufferObjects.indexOf(obj);
        if (index === -1) return;
        this.depthBufferObjects.splice(index, 1);
    }

    bindUBO () {
        const pipeline = this._pipeline as ForwardPipeline;
        const device = pipeline.device;

        let width = device.width, height = device.height;

        let renderTexture = this._renderTexture;
        if (!renderTexture) {
            renderTexture = new RenderTexture();
            renderTexture.reset({ width, height, passInfo: _renderPassInfo })
            this._renderTexture = renderTexture;

            pipeline.descriptorSet.bindSampler(UNIFORM_DEPTH_BUFFER_MAP_BINDING, renderTexture.getGFXSampler());
            pipeline.descriptorSet.bindTexture(UNIFORM_DEPTH_BUFFER_MAP_BINDING, renderTexture.getGFXTexture()!);
        }

        let buffer = pipeline.descriptorSet.getBuffer(UBOCustomCommon.BINDING);
        if (!buffer) {
            buffer = pipeline.device.createBuffer(new GFXBufferInfo(
                GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
                GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
                UBOCustomCommon.SIZE,
            ));
            pipeline.descriptorSet.bindBuffer(UBOCustomCommon.BINDING, buffer);
        }
    }

    updateUBO (camera?: renderer.scene.Camera) {
        const pipeline = this._pipeline as ForwardPipeline;
        const device = pipeline.device;

        let width = device.width, height = device.height;
        // let shadingWidth = pipelineAny._shadingWidth * scale;
        // let shadingHeight = pipelineAny._shadingHeight * scale;
        // if (CC_EDITOR) {
        //     shadingWidth = device.width;
        //     shadingHeight = device.height;
        // }

        let renderTexture = this._renderTexture!;
        if (renderTexture.width !== width || renderTexture.height !== height) {
            renderTexture.resize(width, height);
        }

        if (camera) {
            // let shadowUBO: Float32Array = (pipeline as any)._shadowUBO;
            // Mat4.toArray(shadowUBO, view.camera.matViewProj, UBOShadow.MAT_LIGHT_VIEW_PROJ_OFFSET);
            // pipeline.commandBuffers[0].updateBuffer(pipeline.descriptorSet.getBuffer(UBOShadow.BINDING), shadowUBO);

            let commonUBO = this._buffer;
            commonUBO[UBOCustomCommon.ProjectionParamsOffset] = camera.nearClip;
            commonUBO[UBOCustomCommon.ProjectionParamsOffset + 1] = camera.farClip;
            commonUBO[UBOCustomCommon.ProjectionParamsOffset + 3] = 1 / camera.nearClip;
            commonUBO[UBOCustomCommon.ProjectionParamsOffset + 2] = 1 / camera.farClip;
            pipeline.commandBuffers[0].updateBuffer(pipeline.descriptorSet.getBuffer(UBOCustomCommon.BINDING), commonUBO);
        }
    }

    render (camera: renderer.scene.Camera) {
        if (!this.enabled || this.depthBufferObjects.length === 0) {
            return;
        }

        if (!(camera.visibility & Layers.DepthBuffer)) {
            return;
        }

        if (EDITOR) {
            if (camera.node.name !== 'Editor Camera') {
                return;
            }
        }

        this.updateUBO(camera);

        let renderTexture = this._renderTexture!;

        const pipeline = this._pipeline as ForwardPipeline;
        const device = pipeline.device;

        // command buffer
        const cmdBuff = pipeline.commandBuffers[0];

        const vp = camera.viewport;
        this._renderArea!.x = vp.x * renderTexture.width;
        this._renderArea!.y = vp.y * renderTexture.height;
        this._renderArea!.width = vp.width * renderTexture.width * pipeline.shadingScale;
        this._renderArea!.height = vp.height * renderTexture.height * pipeline.shadingScale;

        const frameBuffer = renderTexture.window!.framebuffer;
        const renderPass = frameBuffer.renderPass;

        _colorAttachment.loadOp = GFXLoadOp.CLEAR;

        cmdBuff.beginRenderPass(renderPass, frameBuffer, this._renderArea!,
            colors, camera.clearDepth, camera.clearStencil);

        cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);

        const depthBufferObjects = this.depthBufferObjects;
        for (let i = 0; i < depthBufferObjects.length; ++i) {
            const mc = depthBufferObjects[i].getComponent(ModelComponent);
            if (mc && mc.model) {
                commitBuffer(mc.model, cmdBuff, device, renderPass, _phaseID);
                continue;
            }

            const tr = depthBufferObjects[i].getComponent(Terrain);
            if (tr) {
                const blocks = tr.getBlocks();
                for (let bi = 0; bi < blocks.length; bi++) {
                    let model = (blocks[bi] as any)._renderable._model as renderer.scene.Model;
                    if (!model.modelBounds) {
                        continue;
                    }
                    camera.frustum.accurate = true;
                    if (!geometry.intersect.aabbFrustumAccurate(model.modelBounds, camera.frustum)) {
                        continue;
                    }
                    commitBuffer(model, cmdBuff, device, renderPass, _phaseID);
                    continue;
                }
            }

        }

        cmdBuff.endRenderPass();

        _colorAttachment.loadOp = GFXLoadOp.LOAD;
    }

    rebuild () {
        this.clear();
    }
    resize () {
    }
    destroy () {
        this.clear();
    }
    clear () {
        if (this._renderTexture) {
            this._renderTexture.destroy();
        }
        this._renderTexture = null;
    }
}
