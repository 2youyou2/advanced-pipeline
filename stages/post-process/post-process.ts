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
        this._updateStage();
    }

    // just for refresh material in editor
    // do not modify manually
    @type(Material)
    get materials () {
        return this._renderers.map(r => r.material);
    }
    set materials (value) {
        this._renderers.forEach((r, index) => {
            r._updateMaterial(value[index]);
        })
        this._updateStage();
    }

    start () {
        let flow = director.root!.pipeline.flows.find(f => f.name === 'PostProcessFlow');
        if (flow) {
            this._stage = flow.stages.find(s => s instanceof PostProcessStage) as PostProcessStage | undefined;
            this._updateStage();
        }
    }

    _updateStage () {
        if (this._stage) {
            this._stage.renderers = this._renderers;
            this._stage.update(this.renderers);
        }
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
