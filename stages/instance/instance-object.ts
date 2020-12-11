
import { CCObject, Component, geometry, InstancedBuffer, instantiate, log, Mat4, Material, Mesh, MeshRenderer, Node, Vec3, _decorator } from 'cc';
import { EDITOR } from 'cc/env';
import { getPhaseID } from '../../defines/pipeline';
import { debug, TechniqueNams } from '../../utils/draw';
import { InstanceManager } from './instace-manager';
import { InstanceForwardStage } from './instance-forward-stage';
const { ccclass, executeInEditMode, property, type } = _decorator;

const _shadowCasterPhaseID = getPhaseID('shadow-caster');
const _tempVec3 = new Vec3;

@ccclass('InstanceBlockData')
export class InstanceBlockData extends CCObject {
    @property
    blockName = '';

    @property
    _matrices: Mat4[] = [];

    @property
    get count () {
        return this._matrices.length;
    }

    _instances: Map<number, InstancedBuffer[]> = new Map;

    worldBound = new geometry.AABB
}

@ccclass('InstanceData')
export class InstanceData extends CCObject {
    @type(Mesh)
    mesh: Mesh | null = null;

    @type(Material)
    materials: Material[] = [];

    @type(InstanceBlockData)
    blocks: InstanceBlockData[] = [];
}


@ccclass('InstanceObject')
@executeInEditMode
export class InstanceObject extends Component {
    @property
    blockSize = 100;

    @type(InstanceData)
    datas: InstanceData[] = [];

    addData (mesh: Mesh, matrix: Mat4, materials: Material[]) {
        let datas = this.datas;
        let data: InstanceData | null = null;
        for (let i = 0; i < datas.length; i++) {
            let canMerge = true;
            if (datas[i].mesh !== mesh) {
                canMerge = false;
                continue;
            }

            if (materials.length !== datas[i].materials.length) {
                continue;
            }

            for (let mi = 0; mi < materials.length; mi++) {
                if (datas[i].materials[mi] !== materials[mi]) {
                    canMerge = false;
                    break;
                }
            }

            if (canMerge) {
                data = datas[i];
                break;
            }

        }

        if (!data) {
            data = new InstanceData();
            data.mesh = mesh;
            data.materials = materials;
            this.datas.push(data);
        }

        Mat4.getTranslation(_tempVec3, matrix);
        let x = Math.floor(_tempVec3.x / this.blockSize);
        let z = Math.floor(_tempVec3.z / this.blockSize);
        let blockName = `${x}_${z}`;

        let block: InstanceBlockData | null = null;
        for (let i = 0; i < data.blocks.length; i++) {
            if (data.blocks[i].blockName === blockName) {
                block = data.blocks[i];
            }
        }
        if (!block) {
            block = new InstanceBlockData();
            block.blockName = blockName;
            block.worldBound.center.set((x + 0.5) * this.blockSize, 0, (z + 0.5) * this.blockSize);
            block.worldBound.halfExtents.set(this.blockSize / 2, 10000, this.blockSize / 2);
            data.blocks.push(block);
        }

        block._matrices.push(new Mat4(matrix));
    }

    clear () {
        this.datas.length = 0;
    }

    _rebuildIndex = 0;
    _blockIndex = 0;

    _startTime = 0;

    rebuild () {
        log('Start rebuild instances...');

        this._startTime = Date.now();

        this.node.removeAllChildren();
        this._rebuildIndex = 0;
        this._blockIndex = 0;
    }

    start () {
        this.rebuild();
    }

    onEnable () {
        if (InstanceManager.instance) {
            InstanceManager.instance.addObject(this);
        }
    }
    onDisable () {
        if (InstanceManager.instance) {
            InstanceManager.instance.removeObject(this);
        }
    }

    update () {
        let drawer = debug.drawer;

        drawer.technique = TechniqueNams.transparent;
        drawer.color.set(255, 255, 255, 100);

        let object = this;
        for (let di = 0; di < object.datas.length; di++) {
            let blocks = object.datas[di].blocks;
            for (let bbi = 0; bbi < blocks.length; bbi++) {
                let block = blocks[bbi];
                drawer.matrix.identity();
                drawer.matrix.translate(block.worldBound.center);
                drawer.box({
                    width: this.blockSize,
                    height: this.blockSize,
                    length: this.blockSize,
                })
            }
        }

        if (this._rebuildIndex >= this.datas.length) {
            if (this._startTime !== 0) {
                log(`End rebuild instances : ${(Date.now() - this._startTime) / 1000}s.`);
                this._startTime = 0;
            }
            return;
        }

        if (EDITOR) {
            (window as any).cce.Engine.repaintInEditMode();
        }

        let data = this.datas[this._rebuildIndex];

        log(`Merge Statics Mesh : ${this._rebuildIndex} - ${this.datas.length}, ${this._blockIndex} - ${data.blocks.length}`);

        let mesh = data.mesh;
        let meshName = mesh ? (mesh.name + '_' + mesh._uuid) : '';

        if (!mesh || !mesh.loaded) {
            let failedNode = new Node('Failed - ' + meshName);
            failedNode.parent = this.node;

            this._rebuildIndex++;
            this._blockIndex = 0;
            return;
        }

        let meshChild = this.node.children[this._rebuildIndex];
        if (!meshChild) {
            meshChild = new Node(meshName);

            meshChild.parent = this.node;

            let mr = meshChild.addComponent(MeshRenderer);
            mr.mesh = mesh;

            for (let mi = 0; mi < data.materials.length; mi++) {
                mr.setMaterial(data.materials[mi], mi);
            }

            mr.enabled = false;
        }

        let block = data.blocks[this._blockIndex++];
        if (!block) {
            this._rebuildIndex++;
            this._blockIndex = 0;
            return;
        }

        let mr = meshChild.getComponent(MeshRenderer);
        let model = mr!.model!;
        let subModels = model.subModels!;
        for (let i = 0; i < subModels.length; i++) {
            let subModel = subModels[i];
            let passes = subModel.passes
            for (let pi = 0; pi < passes.length; pi++) {
                let pass = passes[pi];
                if (pass.phase === _shadowCasterPhaseID) {
                    if (!model.castShadow) {
                        continue;
                    }
                }
                let instance = new InstancedBuffer(passes[pi]);

                let matrices = block._matrices;
                for (let mi = 0; mi < matrices.length; mi++) {
                    let matrix = matrices[mi];
                    meshChild.worldMatrix.set(matrix);

                    (model as any)._transformUpdated = true;
                    model.updateUBOs(0);

                    instance.merge(subModel, model.instancedAttributes, pi);
                }

                let phase = passes[pi].phase;
                let instances = block._instances.get(phase);
                if (!instances) {
                    instances = [];
                    block._instances.set(phase, instances);
                }
                instances.push(instance);
            }
        }
    }
}
