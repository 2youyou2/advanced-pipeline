import { _decorator, ForwardStage, ForwardPipeline, gfx, renderer, GFXColor, __private } from "cc";
import { Layers } from '../../defines/layer';
import { getPhaseID, pipeline } from '../../defines/pipeline';
import { InstanceManager } from './instace-manager';
import { InstanceObjectQueue } from './instanced-object-queue';

const { ccclass, property } = _decorator;
const { SetIndex } = pipeline;

const colors: GFXColor[] = [{ x: 0, y: 0, z: 0, w: 1 }];

let _phase = getPhaseID('default');


@ccclass("InstanceForwardStage")
export class InstanceForwardStage extends ForwardStage {
    _name = 'InstanceForwardStage'

    _instanceObjectQueue = new InstanceObjectQueue();

    resize () {

    }

    updateQueue (cmdBuff: gfx.CommandBuffer, camera: renderer.scene.Camera) {
        let instancedQueue = this._instanceObjectQueue;
        instancedQueue.queue.clear();

        instancedQueue.addBlocks(((globalThis as any).InstanceManager as typeof InstanceManager).instance.getBlocks(), [camera.frustum], _phase);

        instancedQueue.uploadBuffers(cmdBuff);
    }

    renderInstances (camera: renderer.scene.Camera) {
        if (!(camera.visibility & Layers.Instance)) {
            return;
        }

        const pipeline = this._pipeline as ForwardPipeline;
        const cmdBuff = pipeline.commandBuffers[0];
        const device = pipeline.device;

        this.updateQueue(cmdBuff, camera);

        const vp = camera.viewport;
        const window = camera.window! as any as __private.cocos_core_renderer_core_render_window_RenderWindow;
        // render area is not oriented
        const w = window.hasOnScreenAttachments && device.surfaceTransform % 2 ? camera.height : camera.width;
        const h = window.hasOnScreenAttachments && device.surfaceTransform % 2 ? camera.width : camera.height;

        let renderArea = (this as any)._renderArea!;
        renderArea.x = vp.x * w;
        renderArea.y = vp.y * h;
        renderArea.width = vp.width * w * pipeline.shadingScale;
        renderArea.height = vp.height * h * pipeline.shadingScale;

        this._instanceObjectQueue.uploadBuffers(cmdBuff);
        (this as any)._additiveLightQueue.gatherLightPasses(camera, cmdBuff);

        const framebuffer = window.framebuffer;
        const renderPass = framebuffer.colorTextures[0] ? framebuffer.renderPass : pipeline.getRenderPass(camera.clearFlag);

        if (camera.clearFlag & gfx.ClearFlag.COLOR) {
            // if (pipeline.isHDR) {
            //     SRGBToLinear(colors[0], camera.clearColor);
            //     const scale = pipeline.fpScale / camera.exposure;
            //     colors[0].x *= scale;
            //     colors[0].y *= scale;
            //     colors[0].z *= scale;
            // } else {
            colors[0].x = camera.clearColor.x;
            colors[0].y = camera.clearColor.y;
            colors[0].z = camera.clearColor.z;
            // }
        }

        colors[0].w = camera.clearColor.w;

        cmdBuff.beginRenderPass(renderPass, framebuffer, renderArea,
            colors, camera.clearDepth, camera.clearStencil);

        cmdBuff.bindDescriptorSet(SetIndex.GLOBAL, pipeline.descriptorSet);

        this._instanceObjectQueue.recordCommandBuffer(device, renderPass, cmdBuff);

        cmdBuff.endRenderPass();
    }

    render (camera: renderer.scene.Camera) {
        this.renderInstances(camera);

        // should not clear the already draw content
        let clearFlag = camera.clearFlag;
        camera.clearFlag = 0;

        super.render(camera);

        camera.clearFlag = clearFlag;
    }

    rebuild () {

    }

    destroy () {

    }
}
