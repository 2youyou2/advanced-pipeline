import { renderer, GFXFramebuffer } from "cc";

export default class PostProcessCommand {
    pass: renderer.Pass | null = null;
    inputCommands: PostProcessCommand[] = [];
    outputName: string = '';

    constructor (pass: renderer.Pass) {
        this.pass = pass;
    }
}
