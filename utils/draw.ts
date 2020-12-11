import { assetManager, CCObject, Color, Component, Director, director, EffectAsset, find, geometry, gfx, GFXComparisonFunc, GFXCullMode, GFXPrimitiveMode, Mat4, Material, Mesh, MeshRenderer, Node, primitives, PrimitiveType, TERRAIN_HEIGHT_BASE, utils, Vec3, VerticalTextAlignment, _decorator, __private } from 'cc';

const { ccclass } = _decorator;

let _tempVec3 = new Vec3;

let DrawTypeIndex = 0;
export enum DrawType {
    Solid = 1 << DrawTypeIndex++,
    FrameWire = 1 << DrawTypeIndex++,
    FrameWireDouble = 1 << DrawTypeIndex++,
    BoundingLine = 1 << DrawTypeIndex++,
    BoundingLineDouble = 1 << DrawTypeIndex++,
}

export enum CullMode {
    Back = GFXCullMode.BACK,
    Front = GFXCullMode.FRONT,
    None = GFXCullMode.NONE,
}

interface MeshData {
    mesh: Mesh,
    vbuffer: Float32Array,
    ibuffer: Uint16Array,
    vertexCount: number,
    indexCount: number,
    primitiveMode: GFXPrimitiveMode,

    cullMode: GFXCullMode,

    depthFunc?: GFXComparisonFunc,
    depthTest?: boolean,
    depthWrite?: boolean,

    technique: string;

    id: string,
}

let tempBox = primitives.box();
let tempPrimitive: primitives.IGeometry = {
    positions: tempBox.positions,
    colors: new Array(tempBox.positions.length / 3 * 4).fill(255),
    indices: tempBox.indices,
    minPos: new Vec3(-Infinity, -Infinity, -Infinity),
    maxPos: new Vec3(Infinity, Infinity, Infinity)
};

export const TechniqueNams = {
    opaque: 'opaque',
    transparent: 'transparent'
}

@ccclass('MeshDrawer')
export class MeshDrawer extends Component {
    color = Color.WHITE.clone();
    frameWireColor = Color.RED.clone();

    type = DrawType.Solid;
    cull = CullMode.Back;

    depthTest: undefined | boolean;
    depthWrite: undefined | boolean;
    depthFunc: undefined | GFXComparisonFunc;

    // effect = 'builtin-unlit';
    technique = TechniqueNams.transparent;

    matrix = new Mat4;

    depth (depthTest?: boolean, depthWrite?: boolean, depthFunc?: GFXComparisonFunc) {
        this.depthTest = depthTest;
        this.depthWrite = depthWrite;
        this.depthFunc = depthFunc;
    }

    get id () {
        return `${this.technique}_${this.cull}_${this.depthTest}_${this.depthWrite}_${this.depthFunc}`;
    }

    constructor () {
        super();

        for (let name in primitives) {
            if (!this[name]) continue;
            this[name] = function (...args) {
                let p: primitives.IGeometry = primitives[name](...args);

                if (this.type & DrawType.Solid) {
                    p.primitiveMode = GFXPrimitiveMode.TRIANGLE_LIST;
                    this.primitive(p, this.color);
                }
                if (this.type & DrawType.FrameWire || this.type & DrawType.FrameWireDouble) {
                    p.primitiveMode = GFXPrimitiveMode.LINE_LIST;
                    this.primitive(p, this.frameWireColor);
                }
                if (this.type & DrawType.FrameWireDouble) {
                    p.primitiveMode = GFXPrimitiveMode.LINE_LIST;

                    let depthFunc = this.depthFunc;
                    let alpha = this.frameWireColor.a;
                    let technique = this.technique;

                    this.depthFunc = GFXComparisonFunc.GREATER;
                    this.frameWireColor.a = 30;
                    this.technique = TechniqueNams.transparent;

                    this.primitive(p, this.frameWireColor);

                    this.depthFunc = depthFunc;
                    this.frameWireColor.a = alpha;
                    this.technique = technique;
                }
            }
        }
    }

    resetState () {
        this.color.set(Color.WHITE);
        this.type = DrawType.Solid;
        this.cull = CullMode.Back;
        this.depthTest = undefined;
        this.depthWrite = undefined;
        this.depthFunc = undefined;
        this.technique = TechniqueNams.opaque;
        this.matrix.identity();
    }

    clear () {
        this.resetState();

        this._meshDatas.forEach(meshData => {
            meshData.vertexCount = 0;
            meshData.indexCount = 0;
        })
    }

    box = primitives.box
    sphere = primitives.sphere
    cylinder = primitives.cylinder
    cone = primitives.cone
    capsule = primitives.capsule
    torus = primitives.torus
    plane = primitives.plane
    quad = primitives.quad

    primitive (primitive: primitives.IGeometry, color: Color) {
        let primitiveMode = primitive.primitiveMode!;

        let id = this.id + '_' + primitiveMode;
        let meshData = this._meshDatas.get(id);
        if (!meshData) {
            tempPrimitive.primitiveMode = primitiveMode;
            meshData = {
                mesh: utils.createMesh(tempPrimitive),
                vertexCount: 0,
                indexCount: 0,
                vbuffer: new Float32Array(1024),
                ibuffer: new Uint16Array(1024),
                primitiveMode: primitiveMode,

                cullMode: this.cull as any,

                depthWrite: this.depthWrite,
                depthTest: this.depthTest,
                depthFunc: this.depthFunc,

                technique: this.technique,

                id: id
            }
            this._meshDatas.set(id, meshData);
        }

        // 
        let positions = primitive.positions;
        let indices = primitive.indices!;

        let vbuffer = meshData.vbuffer;
        let ibuffer = meshData.ibuffer;

        let vertexStart = meshData.vertexCount;
        let vertexCount = positions.length / 3;

        // 
        let vbOffset = vertexStart * 7;
        let ibOffset = meshData.indexCount;

        // 
        meshData.vertexCount += vertexCount;

        let indexCount = 0;
        if (primitiveMode === GFXPrimitiveMode.POINT_LIST) {
            indexCount = vertexCount;
        }
        else if (primitiveMode === GFXPrimitiveMode.LINE_LIST) {
            indexCount = indices.length * 2;
        }
        else if (primitiveMode === GFXPrimitiveMode.TRIANGLE_LIST) {
            indexCount = indices.length;
        }

        meshData.indexCount += indexCount;

        // 
        if ((meshData.vertexCount * 7) > vbuffer.length) {
            meshData.vbuffer = new Float32Array(vbuffer.length * 2);
            meshData.vbuffer.set(vbuffer);
            vbuffer = meshData.vbuffer;
        }
        if (meshData.indexCount > ibuffer.length) {
            meshData.ibuffer = new Uint16Array(ibuffer.length * 2);
            meshData.ibuffer.set(ibuffer);
            ibuffer = meshData.ibuffer;
        }

        // 
        let positionsOffset = 0;
        for (let i = 0; i < vertexCount; i++) {
            _tempVec3.set(positions[positionsOffset++], positions[positionsOffset++], positions[positionsOffset++]);
            Vec3.transformMat4(_tempVec3, _tempVec3, this.matrix);

            vbuffer[vbOffset++] = _tempVec3.x;
            vbuffer[vbOffset++] = _tempVec3.y;
            vbuffer[vbOffset++] = _tempVec3.z;

            vbuffer[vbOffset++] = color.x;
            vbuffer[vbOffset++] = color.y;
            vbuffer[vbOffset++] = color.z;
            vbuffer[vbOffset++] = color.w;

            if (primitiveMode === GFXPrimitiveMode.POINT_LIST) {
                ibuffer[ibOffset++] = vertexStart + i;
            }
        }

        if (primitiveMode === GFXPrimitiveMode.TRIANGLE_LIST) {
            for (let i = 0; i < indices.length; i++) {
                ibuffer[ibOffset++] = vertexStart + indices[i];
            }
        }
        else if (primitiveMode === GFXPrimitiveMode.LINE_LIST) {
            for (let i = 0; i < indices.length - 1; i++) {
                ibuffer[ibOffset++] = vertexStart + indices[i];
                ibuffer[ibOffset++] = vertexStart + indices[i + 1];
            }
            ibuffer[ibOffset++] = vertexStart + indices[indices.length - 1];
            ibuffer[ibOffset++] = vertexStart + indices[0];
        }
    }

    finish () {
        this._meshDatas.forEach(meshData => {
            let name = 'MeshDrawer_' + meshData.id;
            let node = find(name, this.node)!;
            if (!meshData.vertexCount || !meshData.indexCount) {
                if (node) {
                    node.destroy();
                }
                return;
            }

            let mesh = meshData.mesh;
            let subMesh = mesh.renderingSubMeshes[0];

            let vb = subMesh.vertexBuffers[0];
            let vbuffer = meshData.vbuffer;
            let vertexByteLength = meshData.vertexCount * 7 * 4;
            if (vertexByteLength > vb.size) {
                vb.resize(vertexByteLength);
            }
            vb.update(vbuffer.buffer, 0, vertexByteLength);

            let ib = subMesh.indexBuffer!;
            let ibuffer = meshData.ibuffer;
            let indexByteLength = meshData.indexCount * 2;
            if (indexByteLength > ib.size) {
                ib.resize(ibuffer.byteLength);
            }
            ib.update(ibuffer.buffer, 0, indexByteLength);

            if (!node) {
                node = new Node(name);
                node._objFlags |= CCObject.Flags.DontSave;
                node.parent = this.node;
            }

            let meshRenderer = node.getComponent(MeshRenderer)!;
            if (!meshRenderer) {
                meshRenderer = node.addComponent(MeshRenderer);
                // let effect = EffectAsset.get('builtin-unlit') || EffectAsset.get('unlit')

                assetManager.loadAny('a3cd009f-0ab0-420d-9278-b9fdab939bbc', (err, effect: EffectAsset) => {
                    let techniqueIndex = effect.techniques.findIndex(t => {
                        return t.name === meshData.technique;
                    })

                    if (techniqueIndex === -1) {
                        techniqueIndex = 0;
                    }

                    let depthStencilState: any = {}
                    if (meshData.depthFunc !== undefined) {
                        depthStencilState.depthFunc = meshData.depthFunc
                    }
                    if (meshData.depthTest !== undefined) {
                        depthStencilState.depthTest = meshData.depthTest
                    }
                    if (meshData.depthWrite !== undefined) {
                        depthStencilState.depthWrite = meshData.depthWrite
                    }

                    let m = new Material()
                    m.initialize({
                        effectAsset: effect,
                        technique: techniqueIndex,
                        states: {
                            primitive: meshData.primitiveMode,
                            rasterizerState: {
                                cullMode: meshData.cullMode
                            },
                            depthStencilState: depthStencilState
                        },
                        defines: {
                            USE_VERTEX_COLOR: true
                        }
                    });
                    meshRenderer.setMaterial(m, 0);
                })

            }
            if (meshRenderer.mesh !== mesh) {
                meshRenderer.mesh = mesh;
            }

            let model = meshRenderer.model && meshRenderer.model.subModels[0];
            if (!model) return;
            let ia = model.inputAssembler;
            if (!ia) return;
            ia.vertexCount = meshData.vertexCount;
            ia.indexCount = meshData.indexCount;
            model.update();
        })
    }


    private _meshDatas: Map<string, MeshData> = new Map;
}

class Debug {
    get drawer () {
        let drawNode = find('DEBUG_GLOBAL_DRAW')!;
        if (!drawNode || !drawNode.isValid) {
            drawNode = new Node('DEBUG_GLOBAL_DRAW');
            drawNode._objFlags |= CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy;
            drawNode.parent = director.getScene() as any;
        }

        let drawer = drawNode.getComponent(MeshDrawer);
        if (!drawer) {
            drawer = drawNode.addComponent(MeshDrawer);
        }

        return drawer;
    }

    _beforeUpdate () {
        if (!director.getScene()) {
            return;
        }
        let drawer = this.drawer;
        drawer.clear();

        // drawer.color.set(Color.WHITE);
        // drawer.box({})

        // drawer.technique = TechniqueNams.transparent;
        // drawer.type = DrawType.Solid | DrawType.FrameWireDouble;

        // drawer.color.set(Color.WHITE);
        // drawer.box({
        //     width: 1,
        //     height: 1,
        //     length: 1
        // })

        // drawer.matrix.translate(_tempVec3.set(2, 0, 0))

        // drawer.box({
        //     width: 2,
        //     height: 2,
        //     length: 2
        // })

        // drawer.color.set(255, 0, 0, 100);
        // drawer.box({
        //     width: 2,
        //     height: 2,
        //     length: 2
        // })

    }
    _beforeDraw () {
        if (!director.getScene()) {
            return;
        }
        this.drawer.finish();
    }
}

if (globalThis.debug) {
    director.off(Director.EVENT_BEFORE_DRAW, globalThis.debug._beforeDraw, globalThis.debug);
    director.off(Director.EVENT_BEFORE_UPDATE, globalThis.debug._beforeUpdate, globalThis.debug);

    let globalDrawer = find('DEBUG_GLOBAL_DRAW');
    if (globalDrawer) {
        globalDrawer.destroy();
    }
}

export let debug = globalThis.debug = new Debug;

director.on(Director.EVENT_BEFORE_DRAW, globalThis.debug._beforeDraw, globalThis.debug);
director.on(Director.EVENT_BEFORE_UPDATE, globalThis.debug._beforeUpdate, globalThis.debug);
