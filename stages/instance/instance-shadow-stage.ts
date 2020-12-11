import { _decorator, RenderView, ShadowStage, ForwardPipeline, Color, gfx, director, geometry, renderer, TERRAIN_HEIGHT_BASE, Camera, Scene, RenderPipeline } from "cc";
import { getPhaseID, pipeline } from '../../defines/pipeline';
import { InstanceManager } from './instace-manager';
import { InstanceObject } from './instance-object';
import { RenderInstancedQueue } from './render-instanced-queue';

const { ccclass, property } = _decorator;
const { SetIndex, UBOShadow } = pipeline;

const colors: Color[] = [new Color(1, 1, 1, 1)];

const _phase = getPhaseID('shadow-caster');


@ccclass("InstanceShadowStage")
export class InstanceShadowStage extends ShadowStage {
    _name = 'InstanceShadowStage'

    _instancedQueue = new RenderInstancedQueue();

    resize () {

    }

    updateQueue (cmdBuff: gfx.CommandBuffer, camera: renderer.scene.Camera, pipeline: RenderPipeline) {
        let instancedQueue = this._instancedQueue;
        instancedQueue.queue.clear();

        let shadowMapBuffer = pipeline.descriptorSet.getBuffer(UBOShadow.BINDING);

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
                        let instance = instances[ii];

                        let descriptorSet = renderer.DSPool.get(instance.instances[0]?.hDescriptorSet) as gfx.DescriptorSet;
                        descriptorSet?.bindBuffer(UBOShadow.BINDING, shadowMapBuffer);

                        instancedQueue.queue.add(instance);
                    }
                }
            }
        }

        instancedQueue.uploadBuffers(cmdBuff);
    }

    render (view: RenderView) {
        if (!(this as any)._light || !(this as any)._shadowFrameBuffer) { return; }

        const pipeline = this._pipeline as ForwardPipeline;
        const device = pipeline.device;
        const cmdBuff = pipeline.commandBuffers[0];
        const camera = view.camera;

        const additiveShadowQueue = (this as any)._additiveShadowQueue;
        additiveShadowQueue.gatherLightPasses((this as any)._light, cmdBuff);

        this.updateQueue(cmdBuff, camera, pipeline);

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
        this._instancedQueue.recordCommandBuffer(device, renderPass, cmdBuff);

        cmdBuff.endRenderPass();
    }

    rebuild () {

    }

    destroy () {

    }
}
