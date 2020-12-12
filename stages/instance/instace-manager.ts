import { CCObject, Component, director, find, InstancedBuffer, Mat4, Material, Mesh, MeshRenderer, Node, Quat, Vec3, _decorator } from 'cc';
import { getPhaseID } from '../../defines/pipeline';
import { debug, TechniqueNams } from '../../utils/draw';
import { InstanceBlockData } from './instance-block';
import { InstanceObject } from './instance-object';

const { ccclass, property, type, executeInEditMode } = _decorator

let _tempVec3 = new Vec3;
const _shadowCasterPhaseID = getPhaseID('shadow-caster');

export class InstanceManager {
    static _instance: InstanceManager;
    static get instance () {
        if (!this._instance) {
            this._instance = new InstanceManager;
        }
        return this._instance;
    }

    private objects: InstanceObject[] = [];

    private blocks: InstanceBlockData[] = [];
    private blockMap: Map<string, InstanceBlockData> = new Map;

    private _blockSize = new Vec3(100, 100, 100);
    get blockSize () {
        return this._blockSize;
    }
    set blockSize (val) {
        if (this._blockSize.equals(val)) {
            return;
        }
        this._blockSize.set(val);
        this.dirty = true;
    }

    _dirty = true;
    get dirty () {
        return this._dirty;
    }
    set dirty (value) {
        this._dirty = value;
    }

    addObject (object: InstanceObject) {
        if (this.objects.indexOf(object) === -1) {
            this.objects.push(object);
        }
        this.dirty = true;
    }
    removeObject (object: InstanceObject) {
        let index = this.objects.indexOf(object);
        if (index !== -1) {
            this.objects.splice(index, 1);
        }
        this.dirty = true;
    }

    getBlocks () {
        if (!this._dirty) {
            return this.blocks;
        }
        this._dirty = false;

        console.time('Generate Instance Blocks');

        let blocks = this.blocks;
        let blockMap = this.blockMap;

        blocks.length = 0;
        blockMap.clear();

        let tempNode = find('InstanceTemplate');
        if (tempNode) {
            tempNode.destroy();
        }
        tempNode = new Node('InstanceTemplate');
        tempNode._objFlags |= CCObject.Flags.HideInHierarchy | CCObject.Flags.DontSave;
        tempNode.parent = director.getScene() as any;

        let tempRender: Map<string, MeshRenderer> = new Map;

        for (let i = 0; i < this.objects.length; i++) {
            let object = this.objects[i];
            let datas = object.datas;
            for (let di = 0; di < datas.length; di++) {
                let data = datas[di];
                let matrices = data._matrices;
                let assetID = data.assetId;

                let meshRenderer = tempRender.get(assetID);
                if (!meshRenderer) {
                    let node = new Node();
                    node.parent = tempNode;

                    meshRenderer = node.addComponent(MeshRenderer);
                    meshRenderer.mesh = data.mesh;
                    meshRenderer.shadowCastingMode = data.casterShadow;

                    for (let mi = 0; mi < data.materials.length; mi++) {
                        meshRenderer.setMaterial(data.materials[mi], mi);
                    }

                    meshRenderer.enabled = false;
                    tempRender.set(assetID, meshRenderer);
                }

                let model = meshRenderer.model!;
                let subModels = model.subModels!;
                for (let i = 0; i < subModels.length; i++) {
                    let instanceID = assetID + '_' + i;

                    let subModel = subModels[i];
                    let passes = subModel.passes
                    for (let pi = 0; pi < passes.length; pi++) {
                        let pass = passes[pi];
                        if (pass.phase === _shadowCasterPhaseID) {
                            if (!model.castShadow) {
                                continue;
                            }
                        }

                        for (let mi = 0; mi < matrices.length; mi++) {
                            let matrix = matrices[mi];

                            // 
                            Mat4.getTranslation(_tempVec3, matrix);
                            let x = Math.floor(_tempVec3.x / this.blockSize.x);
                            let z = Math.floor(_tempVec3.z / this.blockSize.z);
                            let blockName = `${x}_${z}`;

                            let block = blockMap.get(blockName);
                            if (!block) {
                                block = new InstanceBlockData;
                                block.blockName = blockName;
                                block.worldBound.center.set((x + 0.5) * this.blockSize.x, 0, (z + 0.5) * this.blockSize.z);
                                block.worldBound.halfExtents.set(this.blockSize.x / 2, this.blockSize.y / 2, this.blockSize.z / 2);

                                blocks.push(block);
                                blockMap.set(blockName, block);
                            }

                            // 
                            let phaseBundle = block._instances.get(pass.phase);
                            if (!phaseBundle) {
                                phaseBundle = new Map;
                                block._instances.set(pass.phase, phaseBundle);
                            }

                            // 
                            let instance = phaseBundle.get(instanceID);
                            if (!instance) {
                                instance = new InstancedBuffer(pass);
                                phaseBundle.set(instanceID, instance);
                            }

                            // 
                            meshRenderer.node.worldMatrix.set(matrix);
                            (model as any)._transformUpdated = true;
                            model.updateUBOs(0);

                            instance.merge(subModel, model.instancedAttributes, pi);
                        }
                    }
                }
            }
        }

        console.timeEnd('Generate Instance Blocks');

        return this.blocks;
    }

    drawdDebug () {
        let drawer = debug.drawer;

        drawer.technique = TechniqueNams.transparent;
        drawer.color.set(255, 255, 255, 50);

        let blocks = this.blocks;
        for (let bbi = 0; bbi < blocks.length; bbi++) {
            let block = blocks[bbi];
            drawer.matrix.fromRTS(Quat.IDENTITY, block.worldBound.center, Vec3.ONE);
            drawer.box({
                width: block.worldBound.halfExtents.x * 2,
                height: block.worldBound.halfExtents.y * 2,
                length: block.worldBound.halfExtents.z * 2,
            })
        }
    }
}

@ccclass('InstanceManagerComponent')
@executeInEditMode
class InstanceManagerComponent extends Component {
    @type(Vec3)
    private _blockSize = new Vec3;
    @type(Vec3)
    get blockSize () {
        return this._blockSize;
    }
    set blockSize (val) {
        this._blockSize.set(val);
        InstanceManager.instance.blockSize = this.blockSize;
    }

    @property
    debug = false;

    onEnable () {
        InstanceManager.instance.blockSize = this.blockSize;
    }

    update () {
        if (this.debug) {
            InstanceManager.instance.drawdDebug();
        }
    }
}

globalThis.InstanceManager = InstanceManager;
