import { _decorator, Component, Node, RenderStage, RenderFlow, RenderView, renderer, GFXClearFlag, GFXPipelineState, GFXCommandBuffer, GFXTextureType, GFXTextureUsageBit, GFXTextureViewType, GFXFormat, Vec2, GFXFramebuffer, GFXTexture, GFXTextureView, pipeline, game, director, Director, IGFXColor, Mat4, CameraComponent, GFXBindingType, GFXBufferUsageBit, GFXMemoryUsageBit, GFXUniformBlock, GFXBuffer } from "cc";
import { createFrameBuffer } from "../utils/frame-buffer";
import { DepthBufferComponent } from "./depth-buffer-component";
import { UBOLitShadow } from "./depth-buffer-ubo";

const { ccclass, property } = _decorator;

const _colors: IGFXColor[] = [{ r: 1, g: 1, b: 1, a: 1 }];
const _bufs: GFXCommandBuffer[] = [];

type DepthBufferBinding = {
    type: GFXBindingType,
    blockInfo: GFXUniformBlock,
    buffer: GFXBuffer,
    ubo: UBOLitShadow,
}

type DpethBuffer = {
    buffer: GFXFramebuffer,
    binding: DepthBufferBinding
}

@ccclass("DepthBufferStage")
export class DepthBufferStage extends RenderStage {

    _psos: GFXPipelineState[] = []

    _currentUboBinding: DepthBufferBinding = null;
    _currentDepthBuffer: GFXFramebuffer = null;
    _depthBuffers: Map<RenderView, DpethBuffer> = new Map();

    public activate (flow: RenderFlow) {
        super.activate(flow);
        this.createCmdBuffer();
    }

    /**
     * @zh
     * 销毁函数。
     */
    public destroy () {
        if (this._cmdBuff) {
            this._cmdBuff.destroy();
            this._cmdBuff = null;
        }
    }

    public sortRenderQueue () {
        let depthTexture = this._currentDepthBuffer.colorViews[0];

        this._renderQueues.forEach(this.renderQueueClearFunc);
        const renderObjects = this._pipeline.renderObjects;
        for (let i = 0; i < renderObjects.length; ++i) {
            const ro = renderObjects[i];
            for (let l = 0; l < ro.model.subModelNum; l++) {
                for (let j = 0; j < ro.model.getSubModel(l).passes.length; j++) {
                    for (let k = 0; k < this._renderQueues.length; k++) {
                        this._renderQueues[k].insertRenderPass(ro, l, j);

                        const subModel = ro.model.getSubModel(l);
                        const pass: renderer.Pass = subModel.passes[j];

                        let updated = false;
                        // @ts-ignore
                        // if (!pass.binded_sl_depthTexture) {
                            let sampler = pass.getBinding('sl_depthTexture');
                            if (sampler) {
                                pass.bindTextureView(sampler, depthTexture);
                                updated = true;
                                // @ts-ignore
                                // pass.binded_sl_depthTexture = true;
                            }
                        // }

                        // @ts-ignore
                        // if (!pass.binded_SL_LIT_SHADOW) {
                            if (pass.getBinding('sl_litShadowMatViewProj') !== undefined) {
                                pass.bindBuffer(UBOLitShadow.BLOCK.binding, this._currentUboBinding.buffer);
                                updated = true;
                                // @ts-ignore
                                // pass.binded_SL_LIT_SHADOW = true;
                            }
                        // }

                        if (updated) {
                            pass.update();
                        }
                    }
                }
            }
        }

        this._renderQueues.forEach(this.renderQueueSortFunc);
    }

    switchDepthBuffer (view) {
        let depthBuffer = this._depthBuffers.get(view);
        if (!depthBuffer) {
            const buffer = this.pipeline.device.createBuffer({
                usage: GFXBufferUsageBit.UNIFORM | GFXBufferUsageBit.TRANSFER_DST,
                memUsage: GFXMemoryUsageBit.HOST | GFXMemoryUsageBit.DEVICE,
                size: UBOLitShadow.SIZE,
            });

            let uboLitShadow = new UBOLitShadow();

            let uboBinding = {
                type: GFXBindingType.UNIFORM_BUFFER,
                blockInfo: UBOLitShadow.BLOCK,
                buffer: buffer,
                ubo: uboLitShadow,
            };

            depthBuffer = {
                buffer: createFrameBuffer(this._pipeline, this._device, true),
                binding: uboBinding
            }

            this._depthBuffers.set(view, depthBuffer);
        }

        this._currentUboBinding = depthBuffer.binding;
        this._currentDepthBuffer = depthBuffer.buffer;
    }

    updateCameraMatToUBO (camera: renderer.Camera) {
        let uboBinding = this._currentUboBinding;
        const fv = uboBinding.ubo.view;

        Mat4.toArray(fv, camera.matViewProj, UBOLitShadow.LIT_SHADOW_MAT_VIEW_PROJ_OFFSET);

        fv[UBOLitShadow.LIT_SHADOW_PARAMS] = camera.nearClip;
        fv[UBOLitShadow.LIT_SHADOW_PARAMS + 1] = camera.farClip;
        fv[UBOLitShadow.LIT_SHADOW_PARAMS + 2] = 0;

        uboBinding.buffer!.update(fv);
    }

    render (view: RenderView) {
        const camera = view.camera!;
        // @ts-ignore
        if (!CC_EDITOR) {
            let depthComponent = camera.node.getComponent(DepthBufferComponent);
            if (!depthComponent || !depthComponent.enabled) {
                return;
            }
        }
        else if (view.name !== "Editor Camera") {
            return;
        }

        this.switchDepthBuffer(view);
        this.updateCameraMatToUBO(camera);
        this.sortRenderQueue();

        let cmdBuff = this._cmdBuff;
        cmdBuff.begin();

        const vp = camera.viewport;
        this._renderArea!.x = vp.x * camera.width;
        this._renderArea!.y = vp.y * camera.height;


        let framebuffer = this._currentDepthBuffer;
        this._renderArea!.width = camera.width;
        this._renderArea!.height = camera.height;

        cmdBuff.beginRenderPass(framebuffer, this._renderArea!,
            camera.clearFlag, _colors, camera.clearDepth, camera.clearStencil);

        for (let i = 0; i < this._renderQueues.length; i++) {
            cmdBuff.execute(this._renderQueues[i].cmdBuffs.array, this._renderQueues[i].cmdBuffCount);
        }

        cmdBuff.endRenderPass();

        cmdBuff.end();

        _bufs.length = 0;
        _bufs[0] = cmdBuff;
        this._device!.queue.submit(_bufs);
    }

    resize (width: number, height: number) {
        this.rebuild();
    }
    rebuild () {
        for (let values of this._depthBuffers) {
            values[1].buffer.destroy()
        }
        this._depthBuffers.clear();
    }
}
