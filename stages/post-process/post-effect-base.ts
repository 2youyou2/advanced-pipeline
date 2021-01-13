import { CCObject, Color, Material, MeshRenderer, Node, utils, warn, _decorator } from 'cc';
import { cce, EDITOR } from '../../utils/editor';
import postProcessMaterials from './editor/post-process-renderer-materials';
import { PostProcess } from './post-process';
import PostProcessCommand from './post-process-command';
const { property, ccclass, type } = _decorator

export const postEffects: Map<string, typeof PostEffectBase> = new Map();
export function register (cls: typeof PostEffectBase) {
    postEffects.set(cls.effectName, cls);
}

export function get (effectName: string) {
    return postEffects.get(effectName);
}

export class PassDefine {

    outputName = '';
    inputNames: string[] = []

    constructor (outputName?: string, inputNames?: string[]) {
        if (outputName !== undefined) {
            this.outputName = outputName;
        }
        if (inputNames !== undefined) {
            this.inputNames = inputNames;
        }
    }
}


@ccclass('PostEffectBase')
export class PostEffectBase {
    static effectName = '';
    static passDefines: Map<number, PassDefine> | undefined = new Map;

    _commands: PostProcessCommand[] = [];
    get commands () {
        this.init();
        return this._commands;
    }

    _postProcess: PostProcess | undefined;

    @property
    _enabled = true;
    @property
    get enabled () {
        return this._enabled;
    }
    set enabled (v) {
        this._enabled = v;
        if (this._postProcess) {
            this._postProcess.rebuild();
        }
    }

    @type(Material)
    _material: Material | undefined;
    @type(Material)
    get material () {
        return this._material;
    }

    _inited = false;
    init () {
        if (this._inited) return;
        this._inited = true;
        this._updateType();
    }

    _updateProperty (name: string, val: any) {
        if (!this._material) return;
        this._material.setProperty(name, val);
        if (EDITOR) {
            cce.Engine.repaintInEditMode();
        }
    }

    _updateType () {
        if (EDITOR) {
            let materialName = (this.constructor as typeof PostEffectBase).effectName;
            this._material = postProcessMaterials.get(materialName);
        }
        this._updateCommands();
    }

    _updateCommands () {
        let commandMap: Map<string, PostProcessCommand> = new Map;
        let commands = this._commands;
        commands.length = 0;
        commandMap.clear();

        let material = this._material;
        if (!material) return;

        let postProcess = this._postProcess;
        if (!postProcess) return;

        let mesh = utils.createMesh({
            positions: [
                -1, -1, 0, 1, -1, 0,
                -1, 1, 0, 1, 1, 0,
            ],
            uvs: [
                0, 1, 1, 1,
                0, 0, 1, 0
            ],
            indices: [
                0, 1, 2, 1, 3, 2
            ]
        });

        let node = new Node();
        node._objFlags = CCObject.Flags.DontSave;

        let mr = node.addComponent(MeshRenderer);
        mr.mesh = mesh;
        mr.material = this._material!;
        node.parent = postProcess.node;

        let subModels = mr.model?.subModels!;

        let passDefines = (this.constructor as typeof PostEffectBase).passDefines;

        for (let i = 0; i < subModels.length; i++) {
            let submodel = subModels[i];

            let passes = submodel.passes;
            for (let pi = 0; pi < passes.length; pi++) {
                let pass = passes[pi];
                let cmd = new PostProcessCommand(submodel, pass);

                let define = passDefines && passDefines.get(pi);
                if (define) {
                    if (define.outputName) {
                        cmd.outputName = define.outputName;
                        commandMap.set(cmd.outputName, cmd);
                    }
                    if (define.inputNames && define.inputNames.length > 0) {
                        for (let j = 0; j < define.inputNames.length; j++) {
                            let name = define.inputNames[j];
                            let inputCmd = commandMap.get(name);
                            if (!inputCmd) {
                                warn(`Can not find input command with name ${name}`);
                                continue;
                            }
                            cmd.inputCommands.push(inputCmd);
                        }
                    }
                }

                commands.push(cmd);
            }
        }

        node.active = false;
    }
}
