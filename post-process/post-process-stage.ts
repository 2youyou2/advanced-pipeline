import { _decorator, Component, Node, RenderStage, RenderFlow, RenderView, renderer, GFXClearFlag, GFXPipelineState, GFXCommandBuffer, GFXTextureType, GFXTextureUsageBit, GFXTextureViewType, GFXFormat, Vec2, GFXFramebuffer, GFXTexture, GFXTextureView, pipeline, game, director, Director, IGFXColor } from "cc";
import PostProcessCommand from "./post-process-command";
import PostProcessRenderer from "./post-process-renderer";
import { createFrameBuffer } from "./utils/frame-buffer";

const { UBOGlobal } = pipeline;
const { ccclass, property } = _decorator;

const bufs: GFXCommandBuffer[] = [];

class PostEffectRenderCommand {
    pass: renderer.Pass = null;
    input: GFXFramebuffer = null;
    output: GFXFramebuffer = null;

    constructor (pass: renderer.Pass, input: GFXFramebuffer, output: GFXFramebuffer) {
        this.pass = pass;
        this.input = input;
        this.output = output;
    }
}

const _colors: IGFXColor[] = [ { r: 0, g: 0, b: 0, a: 1 } ];

@ccclass("PostProcessStage")
export class PostProcessStage extends RenderStage {

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    _psos: GFXPipelineState[] = []

    public activate (flow: RenderFlow) {
        super.activate(flow);
        this.createCmdBuffer();
    }

    /**
     * @zh
     * 销毁函数。
     */
    public destroy () {
        if (this._cmdBuff) {
            this._cmdBuff.destroy();
            this._cmdBuff = null;
        }
    }

    render (view: RenderView) {
        let cmdBuff = this._cmdBuff;

        this.sortRenderQueue();

        cmdBuff.begin();

        // draw main
        const camera = view.camera!;
        
        _colors[0].a = camera.clearColor.a;
        _colors[0].r = camera.clearColor.r;
        _colors[0].g = camera.clearColor.g;
        _colors[0].b = camera.clearColor.b;

        const vp = camera.viewport;
        this._renderArea!.x = vp.x * camera.width;
        this._renderArea!.y = vp.y * camera.height;

        let framebuffer = view.window!.framebuffer;
        if (this._renderCommands.length !== 0) {
            framebuffer = this._originFrameBuffer;
            
            this._renderArea!.width = camera.width * this.SSAA;
            this._renderArea!.height = camera.height * this.SSAA;
        }
        else {
            this._renderArea!.width = camera.width;
            this._renderArea!.height = camera.height;
        }

        cmdBuff.beginRenderPass(framebuffer, this._renderArea!,
            camera.clearFlag, _colors, camera.clearDepth, camera.clearStencil);

        for (let i = 0; i < this._renderQueues.length; i++) {
            cmdBuff.execute(this._renderQueues[i].cmdBuffs.array, this._renderQueues[i].cmdBuffCount);
        }

        cmdBuff.endRenderPass();

        // draw post process
        let commands = this._renderCommands;
        if (commands.length !== 0) {
            let pipeline = this._pipeline!;
            let quadIA = pipeline.quadIA;
    
            for (let i = 0; i < commands.length; i++) {
                this._renderArea!.width = camera.width;
                this._renderArea!.height = camera.height;
                framebuffer = commands[i].output;
    
                if (!framebuffer) {
                    framebuffer = view.window!.framebuffer;
                }
    
                cmdBuff.beginRenderPass(framebuffer, this._renderArea!,
                    GFXClearFlag.ALL, [{ r: 0.0, g: 0.0, b: 0.0, a: 1.0 }], 1.0, 0);
                cmdBuff.bindPipelineState(this._psos[i]);
                cmdBuff.bindBindingLayout(this._psos[i].pipelineLayout.layouts[0]);
                cmdBuff.bindInputAssembler(quadIA);
                cmdBuff.draw(quadIA);
                cmdBuff.endRenderPass();
            }
        }
        

        cmdBuff.end();

        bufs.length = 0;
        bufs[0] = cmdBuff;
        this._device!.queue.submit(bufs);
    }

    resize (width: number, height: number) { }

    _renderers: PostProcessRenderer[] = [];
    get renderers () {
        return this._renderers;
    }
    set renderers (value) {
        this._renderers = value;
        this.rebuild();
    }

    _renderCommands: PostEffectRenderCommand[] = [];

    _SSAA = 1;
    get SSAA () {
        return this._SSAA;
    }
    set SSAA (value) {
        this._SSAA = value;
        this.rebuild();
    }

    update (renderers: PostProcessRenderer[], SSAA = 1) {
        this._renderers = renderers;
        if (SSAA !== this._SSAA) {
            this._SSAA = SSAA;
            if (this._originFrameBuffer) {
                this._originFrameBuffer.destroy();
            }
            this._originFrameBuffer = null;
        }
        this.rebuild();
    }

    _originFrameBuffer:GFXFramebuffer = null;
    rebuild () {
        this._psos.length = 0;

        let renderCommands = this._renderCommands;
        renderCommands.length = 0;

        let hasCommand = false;
        let renderers = this._renderers;
        for (let ri = 0; ri < renderers.length; ri++) {
            let renderer = this.renderers[ri];
            if (!renderer || !renderer.enabled) {
                continue;
            }
            hasCommand = true;
            break;
        }

        if (!hasCommand) return;

        let pipeline = this._pipeline!;

        if (!this._originFrameBuffer) {
            this._originFrameBuffer = createFrameBuffer(this._pipeline, this._device, true, this.SSAA);
        }
        let originFrameBuffer = this._framebuffer = this._originFrameBuffer;

        let originTexture = originFrameBuffer.colorViews[0];

        let flip: GFXFramebuffer, flop: GFXFramebuffer, tmp: GFXFramebuffer;
        const globalUBO = pipeline.globalBindings.get(UBOGlobal.BLOCK.name);

        let framebufferMap: Map<string, GFXFramebuffer> = new Map();

        for (let ri = 0; ri < renderers.length; ri++) {
            let renderer = this.renderers[ri];
            if (!renderer || !renderer.enabled) {
                continue;
            }

            let commands = renderer.commands;
            for (let ci = 0; ci < commands.length; ci++) {
                let command = commands[ci];
                let pass = command.pass;

                pass.bindBuffer(UBOGlobal.BLOCK.binding, globalUBO!.buffer!);

                let originSampler = pass.getBinding('pe_origin_texture');
                if (originSampler) {
                    pass.bindTextureView(originSampler, originTexture);
                }

                if (command.inputCommands) {
                    for (let ii = 0; ii < command.inputCommands.length; ii++) {
                        let inputName = command.inputCommands[ii].outputName;
                        let inputTexture = pass.getBinding(inputName);
                        if (!inputTexture) {
                            cc.warn(`Can not find input name [${inputName}] for post process renderer [${typeof renderer}]`);
                            continue;
                        }
                        
                        let framebuffer = framebufferMap.get(inputName);
                        if (!framebuffer) {
                            cc.warn(`Can not find input frame buffer for input name [${inputName}] in post process renderer [${typeof renderer}]`);
                            continue;
                        }
                        pass.bindTextureView(inputTexture, framebuffer.colorViews[0]);
                    }
                }

                let input = flip || originFrameBuffer;

                let inputSampler = pass.getBinding('pe_input_texture');
                if (inputSampler) {
                    pass.bindTextureView(inputSampler, input.colorViews[0]);
                }

                if (!flop) {
                    flop = createFrameBuffer(this._pipeline, this._device);
                }

                renderCommands.push(new PostEffectRenderCommand(pass, input, flop));

                if (command.outputName) {
                    framebufferMap.set(command.outputName, flop);
                    flop = null;
                }

                tmp = flip;
                flip = flop;
                flop = tmp;

                let pso = pass.createPipelineState();
                let bindingLayout = pso!.pipelineLayout.layouts[0];
                bindingLayout.update();

                pass.update();
                this._psos.push(pso);
            }
        }

        // last command should output to screen
        if (renderCommands.length > 0) {
            renderCommands[renderCommands.length - 1].output = null;
        }
    }
}

director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, () => {
    let flow = director.root.pipeline.getFlow('PostProcessFlow');
    if (flow) {
        let stage = flow.stages[0] as PostProcessStage;
        stage.renderers = [];
    }
})
