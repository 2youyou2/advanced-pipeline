import { _decorator, Component, Node, RenderStage, RenderFlow, RenderView, renderer, GFXClearFlag, GFXPipelineState, GFXCommandBuffer, GFXTextureType, GFXTextureUsageBit, GFXTextureViewType, GFXFormat, Vec2, GFXFramebuffer, GFXTexture, GFXTextureView, pipeline, game, director, Director, IGFXColor } from "cc";
import { createFrameBuffer } from "./utils/frame-buffer";
import { DepthBufferComponent } from "./depth-buffer-component";

const { ccclass, property } = _decorator;

const _colors: IGFXColor[] = [{ r: 1, g: 1, b: 1, a: 1 }];
const _bufs: GFXCommandBuffer[] = [];

@ccclass("DepthBufferStage")
export class DepthBufferStage extends RenderStage {

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    _psos: GFXPipelineState[] = []

    _depthBuffer: GFXFramebuffer = null;

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
        let depthTexture = this._depthBuffer.colorViews[0];

        this._renderQueues.forEach(this.renderQueueClearFunc);
        const renderObjects = this._pipeline.renderObjects;
        for (let i = 0; i < renderObjects.length; ++i) {
            const ro = renderObjects[i];
            for (let l = 0; l < ro.model.subModelNum; l++) {
                for (let j = 0; j < ro.model.getSubModel(l).passes.length; j++) {
                    for (let k = 0; k < this._renderQueues.length; k++) {
                        this._renderQueues[k].insertRenderPass(ro, l, j);

                        const subModel = ro.model.getSubModel(l);
                        const pass = subModel.passes[j];

                        let sampler = pass.getBinding('depthTexture');
                        if (sampler) {
                            pass.bindTextureView(sampler, depthTexture);
                            pass.update();
                        }
                    }
                }
            }
        }
        this._renderQueues.forEach(this.renderQueueSortFunc);
    }

    render (view: RenderView) {
        const camera = view.camera!;
        let depthComponent = camera.node.getComponent(DepthBufferComponent);
        if (!depthComponent || !depthComponent.enabled) {
            return;
        }

        if (!this._depthBuffer) {
            this._depthBuffer = createFrameBuffer(this._pipeline, this._device);
        }

        this.sortRenderQueue();

        let cmdBuff = this._cmdBuff;
        cmdBuff.begin();

        const vp = camera.viewport;
        this._renderArea!.x = vp.x * camera.width;
        this._renderArea!.y = vp.y * camera.height;


        let framebuffer = this._depthBuffer;
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

    resize (width: number, height: number) { }
    rebuild () { }
}
