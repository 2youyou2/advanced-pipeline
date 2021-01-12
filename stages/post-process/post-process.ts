import { _decorator, Component, director, Material } from 'cc';
const { ccclass, property, type, executeInEditMode } = _decorator;

import { PostProcessStage } from './post-process-stage';
import PostProcessRenderer from './post-process-renderer';

@ccclass('PostProcess')
@executeInEditMode
export class PostProcess extends Component {
    _stage: PostProcessStage | undefined;

    @type(PostProcessRenderer)
    _renderers: PostProcessRenderer[] = [];
    @type(PostProcessRenderer)
    get renderers () {
        return this._renderers;
    }
    set renderers (value) {
        this._renderers = value;
        this._updateRenderers();
        this._updateStage();
    }

    // just for refresh material in editor
    // do not modify manually
    @type(Material)
    get materials () {
        return this._renderers.map(r => r.material);
    }
    // set materials (value) {
    //     this._renderers.forEach((r, index) => {
    //         r._updateMaterial(value[index]);
    //     })
    //     this._updateStage();
    // }

    start () {
        this._updateRenderers();

        this._stage = undefined;
        director.root!.pipeline.flows.forEach(flow => {
            this._stage = flow.stages.find(s => s.name === "PostProcessStage") as PostProcessStage | undefined;
            if (this._stage) {
                return;
            }
        })

        this._updateStage();
    }

    private _updateRenderers () {
        this.node.removeAllChildren();
        this._renderers.forEach(r => {
            r._postProcess = this;
        })
    }

    private _updateStage () {
        if (this._stage) {
            this._stage.renderers = this._renderers;
            this._stage.update(this.renderers);
        }
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
