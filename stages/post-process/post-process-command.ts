import { renderer, GFXFramebuffer } from "cc";

export default class PostProcessCommand {
    pass: renderer.Pass | undefined = undefined;
    submodel: renderer.scene.SubModel | undefined;

    inputCommands: PostProcessCommand[] = [];
    outputName: string = '';

    constructor (submodel: renderer.scene.SubModel, pass: renderer.Pass) {
        this.submodel = submodel;
        this.pass = pass;
    }
}
