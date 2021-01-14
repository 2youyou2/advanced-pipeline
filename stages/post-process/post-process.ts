import { _decorator, Component, director, Material } from 'cc';
const { ccclass, property, type, executeInEditMode } = _decorator;

import { PostProcessStage } from './post-process-stage';

import { TonemapEffect } from './effects/tonemap';
import { VignetteEffect } from './effects/vignette';
import { PostEffectBase } from './post-effect-base';
import { BloomEffect } from './effects/bloom';
import { ColorGradingEffect } from './effects/color-grading';

function effectOrder (pp: PostProcess, name: string) {
    if (!pp._effectsOrder) {
        pp._effectsOrder = [];
    }
    pp._effectsOrder.push(name);
}

@ccclass('PostProcess')
@executeInEditMode
export class PostProcess extends Component {
    _stage: PostProcessStage | undefined;

    _effects: PostEffectBase[] = [];
    _effectsOrder!: string[];

    @type(BloomEffect)
    @effectOrder
    bloom = new BloomEffect

    @type(ColorGradingEffect)
    @effectOrder
    colorGrading = new ColorGradingEffect

    @type(TonemapEffect)
    @effectOrder
    tonemap = new TonemapEffect

    @type(VignetteEffect)
    @effectOrder
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
        this._clearStage();
    }

    rebuild () {
        this._updateRenderers();
        this._updateStage();
    }

    private _updateRenderers () {
        this.node.removeAllChildren();

        this._effects.length = 0;
        let isReverse = false;
        this._effectsOrder.forEach(name => {
            let effect = (this as any)[name] as PostEffectBase;
            effect.postProcess = this;

            if (effect && effect.enabled) {

                effect._inited = false;

                if (this._effects.length >= 2) {
                    isReverse = !isReverse;
                }
                effect.isReverse = isReverse;
                isReverse = !isReverse;


                this._effects.push(effect);
            }
        })
    }

    private _updateStage () {
        if (this._stage) {
            this._stage.effects = this.enabledInHierarchy ? this._effects : [];
        }
    }
    private _clearStage () {
        if (this._stage) {
            this._stage.clear();
        }
    }
}
