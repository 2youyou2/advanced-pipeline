import { _decorator, RenderView, ForwardStage, ForwardPipeline, Color, gfx, director, geometry } from "cc";
import { getPhaseID, pipeline } from '../../defines/pipeline';
import { InstanceManager } from './instace-manager';

const { ccclass, property } = _decorator;
const { SetIndex } = pipeline;

const colors: Color[] = [new Color(0, 0, 0, 1)];

let _phase = getPhaseID('default');


@ccclass("InstanceForwardStage")
export class InstanceForwardStage extends ForwardStage {
    _name = 'InstanceForwardStage'

    resize () {

    }

    renderInstances (view: RenderView) {
        const camera = view.camera;

        let instancedQueue = (this as any)._instancedQueue;
        instancedQueue.queue.clear();

        let objects = InstanceManager.instance.objects;
        for (let bi = 0; bi < objects.length; bi++) {
            let object = objects[bi];
            for (let di = 0; di < object.datas.length; di++) {
                let blocks = object.datas[di].blocks;
                for (let bbi = 0; bbi < blocks.length; bbi++) {
                    let block = blocks[bbi];
                    if (!geometry.intersect.aabbFrustum(block.worldBound, camera.frustum)) {
                        continue;
                    }

                    let instances = block._instances.get(_phase);
                    if (!instances) {
                        continue;
                    }

                    for (let ii = 0; ii < instances.length; ii++) {
                        instancedQueue.queue.add(instances[ii]);
                    }
                }
            }
        }

        const pipeline = this._pipeline as ForwardPipeline;
        const device = pipeline.device;

        const vp = camera.viewport;

        // render area is not oriented
        const w = view.window.hasOnScreenAttachments && device.surfaceTransform % 2 ? camera.height : camera.width;
        const h = view.window.hasOnScreenAttachments && device.surfaceTransform % 2 ? camera.width : camera.height;

        let renderArea = (this as any)._renderArea!;
        renderArea.x = vp.x * w;
        renderArea.y = vp.y * h;
        renderArea.width = vp.width * w * pipeline.shadingScale;
        renderArea.height = vp.height * h * pipeline.shadingScale;

        const cmdBuff = pipeline.commandBuffers[0];

        instancedQueue.uploadBuffers(cmdBuff);
        (this as any)._additiveLightQueue.gatherLightPasses(view, cmdBuff);

        const framebuffer = view.window.framebuffer;
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

        instancedQueue.recordCommandBuffer(device, renderPass, cmdBuff);

        cmdBuff.endRenderPass();
        instancedQueue.queue.clear();
    }

    render (view: RenderView) {
        this.renderInstances(view);

        // should not clear the already draw content
        let clearFlag = view.camera.clearFlag;
        view.camera.clearFlag = 0;

        super.render(view);

        // clear instance queue
        let instancedQueue = (this as any)._instancedQueue;
        instancedQueue.clear();

        view.camera.clearFlag = clearFlag;
    }

    rebuild () {

    }

    destroy () {

    }
}
