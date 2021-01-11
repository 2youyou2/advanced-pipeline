import { _decorator, ShadowStage, ForwardPipeline, gfx, renderer, GFXColor } from "cc";
import { Layers } from '../../defines/layer';
import { getPhaseID, pipeline } from '../../defines/pipeline';
import { InstanceManager } from './instace-manager';
import { InstanceObjectQueue } from './instanced-object-queue';

const { ccclass, property } = _decorator;
const { SetIndex, UBOShadow } = pipeline;

const colors: GFXColor[] = [{ x: 1, y: 1, z: 1, w: 1 }];

const _phase = getPhaseID('shadow-caster');


@ccclass("InstanceShadowStage")
export class InstanceShadowStage extends ShadowStage {
    _name = 'InstanceShadowStage'

    _instanceObjectQueue = new InstanceObjectQueue();

    resize () {

    }

    updateQueue (cmdBuff: gfx.CommandBuffer, camera: renderer.scene.Camera) {
        if (!(camera.visibility & Layers.Instance)) {
            return;
        }

        let instancedQueue = this._instanceObjectQueue;
        instancedQueue.queue.clear();

        instancedQueue.addBlocks(((globalThis as any).InstanceManager as typeof InstanceManager).instance.getBlocks(), [camera.frustum], _phase);

        instancedQueue.uploadBuffers(cmdBuff);
    }

    render (camera: renderer.scene.Camera) {
        if (!(this as any)._light || !(this as any)._shadowFrameBuffer) { return; }

        const pipeline = this._pipeline as ForwardPipeline;
        const device = pipeline.device;
        const cmdBuff = pipeline.commandBuffers[0];

        const additiveShadowQueue = (this as any)._additiveShadowQueue;
        additiveShadowQueue.gatherLightPasses((this as any)._light, cmdBuff);

        this.updateQueue(cmdBuff, camera);

        const vp = camera.viewport;

        // render area is not oriented
        const shadowInfo = pipeline.shadows;
        const shadowMapSize = shadowInfo.size;
        const w = shadowMapSize.x;
        const h = shadowMapSize.y;

        let renderArea = (this as any)._renderArea!;
        renderArea.x = vp.x * w;
        renderArea.y = vp.y * h;
        renderArea.width = vp.width * w * pipeline.shadingScale;
        renderArea.height = vp.height * h * pipeline.shadingScale;

        const shadowFrameBuffer = (this as any)._shadowFrameBuffer as gfx.Framebuffer;
        const renderPass = shadowFrameBuffer.renderPass;

        cmdBuff.beginRenderPass(renderPass, shadowFrameBuffer, renderArea,
            colors, camera.clearDepth, camera.clearStencil);

        cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);

        additiveShadowQueue.recordCommandBuffer(device, renderPass, cmdBuff);
        this._instanceObjectQueue.recordCommandBuffer(device, renderPass, cmdBuff);

        cmdBuff.endRenderPass();
    }

    rebuild () {

    }

    destroy () {

    }
}
