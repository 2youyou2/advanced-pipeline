import { gfx, InstancedBuffer, PipelineStateManager, renderer } from 'cc';
import { pipeline } from '../../defines/pipeline';

const { DSPool, ShaderPool } = renderer;
const { SetIndex } = pipeline;

/**
 * @en Render queue for instanced batching
 * @zh 渲染合批队列。
 */
export class RenderInstancedQueue {

    /**
     * @en A set of instanced buffer
     * @zh Instance 合批缓存集合。
     */
    public queue = new Set<InstancedBuffer>();

    /**
     * @en Clear the render queue
     * @zh 清空渲染队列。
     */
    public clear () {
        const it = this.queue.values(); let res = it.next();
        while (!res.done) {
            res.value.clear();
            res = it.next();
        }
        this.queue.clear();
    }

    public uploadBuffers (cmdBuff) {
        const it = this.queue.values(); let res = it.next();
        while (!res.done) {
            if (res.value.hasPendingModels) res.value.uploadBuffers(cmdBuff);
            res = it.next();
        }
    }

    /**
     * @en Record command buffer for the current queue
     * @zh 记录命令缓冲。
     * @param cmdBuff The command buffer to store the result
     */
    public recordCommandBuffer (device: gfx.Device, renderPass: gfx.RenderPass, cmdBuff: gfx.CommandBuffer) {
        const it = this.queue.values(); let res = it.next();
        while (!res.done) {
            const { instances, pass, hasPendingModels } = res.value;
            if (hasPendingModels) {
                cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
                let lastPSO: gfx.PipelineState | null = null;
                for (let b = 0; b < instances.length; ++b) {
                    const instance = instances[b];
                    if (!instance.count) { continue; }
                    const shader = ShaderPool.get(instance.hShader);
                    const pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, renderPass, instance.ia);
                    if (lastPSO !== pso) {
                        cmdBuff.bindPipelineState(pso);
                        lastPSO = pso;
                    }
                    cmdBuff.bindDescriptorSet(SetIndex.LOCAL, DSPool.get(instance.hDescriptorSet), res.value.dynamicOffsets);
                    cmdBuff.bindInputAssembler(instance.ia);
                    cmdBuff.draw(instance.ia);
                }
            }
            res = it.next();
        }
    }
}
