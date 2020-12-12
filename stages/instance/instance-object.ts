
import { CCObject, Component, geometry, InstancedBuffer, instantiate, log, mat4, Mat4, Material, Mesh, MeshRenderer, Node, Quat, Vec3, _decorator } from 'cc';
import { EDITOR } from 'cc/env';
import { getPhaseID } from '../../defines/pipeline';
import { debug, TechniqueNams } from '../../utils/draw';
import { InstanceManager } from './instace-manager';
import { InstanceForwardStage } from './instance-forward-stage';
const { ccclass, executeInEditMode, property, type } = _decorator;

// const _shadowCasterPhaseID = getPhaseID('shadow-caster');
// const _tempVec3 = new Vec3;

// @ccclass('InstanceBlockData')
// export class InstanceBlockData extends CCObject {
//     @property
//     blockName = '';

//     @property
//     _matrices: Mat4[] = [];

//     @property
//     get count () {
//         return this._matrices.length;
//     }

//     _instances: Map<number, InstancedBuffer[]> = new Map;

//     worldBound = new geometry.AABB
// }

@ccclass('InstanceData')
export class InstanceData extends CCObject {
    @type(Mesh)
    mesh: Mesh | null = null;

    @type(Material)
    materials: Material[] = [];

    @property
    casterShadow = MeshRenderer.ShadowCastingMode.OFF;

    @property
    assetId = '';

    @property
    _matrices: Mat4[] = [];
}

let _instanceID = 0;
let _instanceTime = Date.now();
function getAssetID (asset) {
    if (!asset._instanceID_) {
        if (asset._uuid) {
            if (_instanceTime !== Date.now()) {
                _instanceID = 0;
                _instanceTime = Date.now();
            }
            asset._instanceID_ = `${_instanceTime}_${_instanceID++}`;
        }
        else {
            asset._instanceID_ = asset._uuid;
        }
    }
    return asset._instanceID_;
}

@ccclass('InstanceObject')
@executeInEditMode
export class InstanceObject extends Component {
    @property
    blockSize = 100;

    @type(InstanceData)
    datas: InstanceData[] = [];

    addData (meshRenderer: MeshRenderer, matrix: Mat4) {
        let mesh = meshRenderer.mesh;
        let materials = meshRenderer.sharedMaterials;

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
            data.materials = materials as any;
            data.casterShadow = meshRenderer.shadowCastingMode;
            data.assetId = getAssetID(mesh);
            for (let i = 0; i < materials.length; i++) {
                data.assetId += '_' + getAssetID(materials[i]);
            }
            this.datas.push(data);
        }

        data._matrices.push(new Mat4(matrix));

        InstanceManager.instance.dirty = true;
    }

    clear () {
        this.datas.length = 0;
    }

    // _rebuildIndex = 0;
    // _blockIndex = 0;

    // _startTime = 0;

    rebuild () {
        // log('Start rebuild instances...');

        this.node.removeAllChildren();

        // this._startTime = Date.now();

        // this._rebuildIndex = 0;
        // this._blockIndex = 0;
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

    // update () {
    //     let drawer = debug.drawer;

    //     drawer.technique = TechniqueNams.transparent;
    //     drawer.color.set(255, 255, 255, 30);

    //     let object = this;
    //     for (let di = 0; di < object.datas.length; di++) {
    //         let blocks = object.datas[di].blocks;
    //         for (let bbi = 0; bbi < blocks.length; bbi++) {
    //             let block = blocks[bbi];
    //             // drawer.matrix.identity();
    //             // Mat4.translate(drawer.matrix, drawer.matrix, block.worldBound.center)
    //             drawer.matrix.fromRTS(Quat.IDENTITY, block.worldBound.center, Vec3.ONE);
    //             drawer.box({
    //                 width: this.blockSize,
    //                 height: this.blockSize,
    //                 length: this.blockSize,
    //             })
    //         }
    //     }

    //     if (this._rebuildIndex >= this.datas.length) {
    //         if (this._startTime !== 0) {
    //             log(`End rebuild instances : ${(Date.now() - this._startTime) / 1000}s.`);
    //             this._startTime = 0;
    //         }
    //         return;
    //     }

    //     if (EDITOR) {
    //         (window as any).cce.Engine.repaintInEditMode();
    //     }

    //     let data = this.datas[this._rebuildIndex];

    //     log(`Merge Statics Mesh : ${this._rebuildIndex} - ${this.datas.length}, ${this._blockIndex} - ${data.blocks.length}`);

    //     let mesh = data.mesh;
    //     let meshName = mesh ? (mesh.name + '_' + mesh._uuid) : '';

    //     if (!mesh || !mesh.loaded) {
    //         let failedNode = new Node('Failed - ' + meshName);
    //         failedNode.parent = this.node;

    //         this._rebuildIndex++;
    //         this._blockIndex = 0;
    //         return;
    //     }

    //     let meshChild = this.node.children[this._rebuildIndex];
    //     if (!meshChild) {
    //         meshChild = new Node(meshName);

    //         meshChild.parent = this.node;

    //         let mr = meshChild.addComponent(MeshRenderer);
    //         mr.mesh = mesh;

    //         for (let mi = 0; mi < data.materials.length; mi++) {
    //             mr.setMaterial(data.materials[mi], mi);
    //         }

    //         mr.enabled = false;
    //     }

    //     let block = data.blocks[this._blockIndex++];
    //     if (!block) {
    //         this._rebuildIndex++;
    //         this._blockIndex = 0;
    //         return;
    //     }

    //     let mr = meshChild.getComponent(MeshRenderer);
    //     let model = mr!.model!;
    //     let subModels = model.subModels!;
    //     for (let i = 0; i < subModels.length; i++) {
    //         let subModel = subModels[i];
    //         let passes = subModel.passes
    //         for (let pi = 0; pi < passes.length; pi++) {
    //             let pass = passes[pi];
    //             if (pass.phase === _shadowCasterPhaseID) {
    //                 if (!model.castShadow) {
    //                     continue;
    //                 }
    //             }
    //             let instance = new InstancedBuffer(passes[pi]);

    //             let matrices = block._matrices;
    //             for (let mi = 0; mi < matrices.length; mi++) {
    //                 let matrix = matrices[mi];
    //                 meshChild.worldMatrix.set(matrix);

    //                 (model as any)._transformUpdated = true;
    //                 model.updateUBOs(0);

    //                 instance.merge(subModel, model.instancedAttributes, pi);
    //             }

    //             let phase = passes[pi].phase;
    //             let instances = block._instances.get(phase);
    //             if (!instances) {
    //                 instances = [];
    //                 block._instances.set(phase, instances);
    //             }
    //             instances.push(instance);
    //         }
    //     }
    // }
}
