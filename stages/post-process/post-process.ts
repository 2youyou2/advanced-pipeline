import { _decorator, Component, director, Material } from 'cc';
const { ccclass, property, type, executeInEditMode } = _decorator;

import { PostProcessStage } from './post-process-stage';

import { TonemapEffect } from './effects/tonemap';
import { VignetteEffect } from './effects/vignette';
import { PostEffectBase } from './post-effect-base';
import { BloomEffect } from './effects/bloom';

let effectsOrder: string[] = [];
function registerEffectOrder (cls: PostProcess, name: string) {
    effectsOrder.push(name);
}

@ccclass('PostProcess')
@executeInEditMode
export class PostProcess extends Component {
    _stage: PostProcessStage | undefined;

    _effects: PostEffectBase[] = [];

    @type(BloomEffect)
    @registerEffectOrder
    bloom = new BloomEffect

    @type(TonemapEffect)
    @registerEffectOrder
    tonemap = new TonemapEffect

    @type(VignetteEffect)
    @registerEffectOrder
    vignette = new VignetteEffect

    onEnable () {
        this._stage = undefined;
        director.root!.pipeline.flows.forEach(flow => {
            this._stage = flow.stages.find(s => s.name === "PostProcessStage") as PostProcessStage | undefined;
            if (this._stage) {
                return;
            }
        })

        this.rebuild();
    }

    onDisable () {
        this._updateStage();
    }

    rebuild () {
        this._updateRenderers();
        this._updateStage();
    }

    private _updateRenderers () {
        this.node.removeAllChildren();

        this._effects.length = 0;
        effectsOrder.forEach(name => {
            let effect = (this as any)[name] as PostEffectBase;
            if (effect && effect.enabled) {
                effect._postProcess = this;
                this._effects.push(effect);
            }
        })
    }

    private _updateStage () {
        if (this._stage) {
            this._stage.effects = this.enabledInHierarchy ? this._effects : [];
        }
    }
}
