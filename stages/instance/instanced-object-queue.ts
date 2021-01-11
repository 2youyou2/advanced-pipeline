import { geometry, gfx, InstancedBuffer, PipelineStateManager, renderer } from 'cc';
import { pipeline } from '../../defines/pipeline';
import { InstanceBlockData } from './instance-block';

const { DSPool, ShaderPool } = renderer;
const { SetIndex } = pipeline;


export class InstanceObjectQueue {

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

    public uploadBuffers (cmdBuff: gfx.CommandBuffer) {
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

    public addBlocks (blocks: InstanceBlockData[], frustums: geometry.Frustum[], phase: number) {
        for (let bbi = 0; bbi < blocks.length; bbi++) {
            let block = blocks[bbi];

            let phaseBundle = block._instances.get(phase);
            if (!phaseBundle) {
                continue;
            }

            let shouldAdd = true;
            for (let fi = 0; fi < frustums.length; fi++) {
                frustums[fi].accurate = true;
                if (!geometry.intersect.aabbFrustumAccurate(block.worldBound, frustums[fi])) {
                    shouldAdd = false;
                    break;
                }
            }

            if (!shouldAdd) {
                continue;
            }

            phaseBundle.forEach(instance => {
                this.queue.add(instance);
            });
        }
    }
}
