import { CCObject, Color, Material, MeshRenderer, Node, utils, warn, _decorator } from 'cc';
import { cce, EDITOR } from '../../utils/editor';
import postProcessMaterials from './editor/post-process-renderer-materials';
import { PostProcess } from './post-process';
import PostProcessCommand from './post-process-command';
import { getMesh } from './quad-mesh';
const { property, ccclass, type } = _decorator

export const postEffects: Map<string, typeof PostEffectBase> = new Map();
export function effect (cls: typeof PostEffectBase) {
    postEffects.set(cls.effectName, cls);
}

export function effectProperty (cls: PostEffectBase, privateName: string) {
    let publicName = privateName;
    if (publicName[0] === '_') {
        publicName = publicName.substring(1);
    }

    if (!cls._effectProperties) {
        cls._effectProperties = [];
    }
    cls._effectProperties.push(publicName);
    let descriptor: any = {
        get () {
            return this[privateName];
        },
        set (v: any) {
            this[privateName] = v;
            this._updateProperty(publicName, v);
        }

    }
    Object.defineProperty(cls, publicName, descriptor)
    property(cls, publicName, descriptor);
}

export function getEffect (effectName: string) {
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

    _effectProperties!: string[];

    isReverse = false;
    postProcess: PostProcess | undefined;

    _commands: PostProcessCommand[] = [];
    get commands () {
        this.init();
        return this._commands;
    }

    _materialInstance: Material | undefined;

    @property
    _enabled = true;
    @property
    get enabled () {
        return this._enabled;
    }
    set enabled (v) {
        this._enabled = v;
        if (this.postProcess) {
            this.postProcess.rebuild();
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
        if (!this._materialInstance) return;
        this._materialInstance.setProperty(name, val);
        this._updatePasses();
        if (EDITOR) {
            cce.Engine.repaintInEditMode();
        }
    }
    _updatePasses () {
        if (!this._materialInstance) return;
        let passes = this._materialInstance.passes;
        for (let i = 0; i < passes.length; i++) {
            passes[i].update();
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

        let postProcess = this.postProcess;
        if (!postProcess) return;

        let isReverse = this.isReverse;
        if (!(this._material!.passes.length % 2)) {
            isReverse = !isReverse;
        }

        let mesh = getMesh(isReverse);

        let node = new Node();
        node._objFlags = CCObject.Flags.DontSave;

        let mr = node.addComponent(MeshRenderer);
        mr.mesh = mesh;
        mr.material = this._material!;
        node.parent = postProcess.node;

        this._materialInstance = mr.getMaterialInstance(0)!;

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
