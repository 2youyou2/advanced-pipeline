import { _decorator, renderer, GFXPipelineState, GFXCommandBuffer, GFXFramebuffer, pipeline, GFXColor, ForwardStage, ForwardPipeline, RenderTexture, GFXRect, __private, warn, GFXColorAttachment, GFXTextureLayout, GFXDepthStencilAttachment, GFXRenderPassInfo, gfx, GFXFilter, GFXAddress, PipelineStateManager, Camera, GFXClearFlag, Rect, Color, Vec4, director, Director, view } from "cc";
import { PostEffectBase } from './post-effect-base';

const { SetIndex } = pipeline;
const { ccclass, property } = _decorator;

class PostEffectRenderCommand {
    subModel: renderer.scene.SubModel | undefined;
    pass: renderer.Pass | undefined;
    input: RenderTexture | undefined;
    output: RenderTexture | undefined;

    constructor (subModel: renderer.scene.SubModel, pass: renderer.Pass, input: RenderTexture, output: RenderTexture) {
        this.subModel = subModel;
        this.pass = pass;
        this.input = input;
        this.output = output;
    }
}

const _colors: GFXColor[] = [];

const _colorAttachment = new GFXColorAttachment();
_colorAttachment.endLayout = GFXTextureLayout.SHADER_READONLY_OPTIMAL;
_colorAttachment.format = gfx.Format.RGBA16F;
const _depthStencilAttachment = new GFXDepthStencilAttachment();
const _renderPassInfo = new GFXRenderPassInfo([_colorAttachment], _depthStencilAttachment);

export class PostProcessCameraSetting {
    window = undefined as __private.cocos_core_renderer_core_render_window_RenderWindow | undefined;
    clearDepth = 1;
    clearStencil = 0;
    clearFlag = GFXClearFlag.ALL;
    viewport = new Rect(0, 0, 1, 1);
    clearColor = new Color(0, 0, 0, 0);

    set (camera: renderer.scene.Camera) {
        this.window = camera.window! as any as __private.cocos_core_renderer_core_render_window_RenderWindow;
        this.clearDepth = camera.clearDepth;
        this.clearStencil = camera.clearStencil;
        this.clearFlag = camera.clearFlag;
        this.viewport.set(camera.viewport);

        Vec4.copy(this.clearColor, camera.clearColor);
    }

    setToCamera (camera: renderer.scene.Camera) {
        camera.changeTargetWindow(this.window as any);

        camera.clearDepth = this.clearDepth;
        camera.clearStencil = this.clearStencil;
        camera.clearFlag = this.clearFlag;
        camera.viewport.set(this.viewport);

        camera.update(true);
        (director.root?.pipeline as ForwardPipeline).updateCameraUBO(camera);

        Vec4.copy(camera.clearColor, this.clearColor);
    }
}

@ccclass("PostProcessStage")
export class PostProcessStage extends ForwardStage {
    _name = "PostProcessStage";

    private _renderArea: GFXRect = { x: 0, y: 0, width: 0, height: 0 };

    postProcessCameraSetting = new PostProcessCameraSetting
    oldCameraSetting = new PostProcessCameraSetting

    initialize (info: any) {
        view.on('design-resolution-changed', () => {
            let divice = director.root?.device!;
            this.resize(divice.width, divice.height);
        }, this);
        return super.initialize(info);
    }

    render (camera: renderer.scene.Camera) {
        const pipeline = this._pipeline as ForwardPipeline;
        const cmdBuff = pipeline.commandBuffers[0];
        const device = pipeline.device;

        const vp = camera.viewport;

        // draw post process
        let commands = this._renderCommands;
        if (commands.length !== 0) {
            let pipeline = this._pipeline!;

            for (let i = 0; i < commands.length; i++) {
                let renderTexture = commands[i].output;

                let framebuffer: GFXFramebuffer;
                if (renderTexture) {
                    framebuffer = renderTexture.window!.framebuffer
                }
                else {
                    framebuffer = this.oldCameraSetting.window!.framebuffer;
                }

                this._renderArea!.width = camera.width;
                this._renderArea!.height = camera.height;

                if (!renderTexture) {
                    this._renderArea!.x = vp.x * camera.width;
                    this._renderArea!.y = vp.y * camera.height;
                    this._renderArea!.width *= vp.width;
                    this._renderArea!.height *= vp.height;

                    this.oldCameraSetting.setToCamera(camera);
                }
                else {
                    this._renderArea!.x = 0;
                    this._renderArea!.y = 0;
                }

                _colors[0] = camera.clearColor;

                const renderPass = framebuffer.colorTextures[0] ? framebuffer.renderPass : (pipeline as ForwardPipeline).getRenderPass(camera.clearFlag);
                cmdBuff.beginRenderPass(renderPass, framebuffer, this._renderArea!,
                    _colors, camera.clearDepth, camera.clearStencil);

                let pass = commands[i].pass!;
                let subModel = commands[i].subModel!;

                let ia = subModel.inputAssembler;

                // let passIdx = subModel.passes.indexOf(pass);
                // const shader = ShaderPool.get(SubModelPool.get(subModel.handle, SubModelView.SHADER_0 + passIdx) as renderer.ShaderHandle);
                const shader = renderer.ShaderPool.get(pass.getShaderVariant());

                const pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, framebuffer.renderPass, ia);
                cmdBuff.bindPipelineState(pso);
                cmdBuff.bindDescriptorSet(SetIndex.MATERIAL, pass.descriptorSet);
                cmdBuff.bindDescriptorSet(SetIndex.LOCAL, subModel.descriptorSet);
                cmdBuff.bindInputAssembler(ia);
                cmdBuff.draw(ia);

                cmdBuff.endRenderPass();
            }
        }
    }

    _effects: PostEffectBase[] = [];
    get effects () {
        return this._effects;
    }
    set effects (value) {
        this._effects = value;
        this.rebuild();
    }

    _renderCommands: PostEffectRenderCommand[] = [];

    clear () {
        this._effects.length = 0;
        this._renderCommands.length = 0;
    }

    get usedTextures () {
        let usedTextures: (RenderTexture | undefined)[] = [];
        let renderCommands = this._renderCommands;
        for (let i = 0; i < renderCommands.length; i++) {
            if (renderCommands[i].input && !usedTextures.includes(renderCommands[i].input)) {
                if (renderCommands[i].input !== this._originRenderTexture) {
                    usedTextures.push(renderCommands[i].input)
                }
            }
            if (renderCommands[i].output && !usedTextures.includes(renderCommands[i].output)) {
                usedTextures.push(renderCommands[i].output)
            }
        }
        return usedTextures;
    }

    _originRenderTexture: RenderTexture | undefined;
    rebuild () {
        let frameBuffersToDestroy = this.usedTextures;
        for (let i = 0; i < frameBuffersToDestroy.length; i++) {
            if (frameBuffersToDestroy[i]) {
                frameBuffersToDestroy[i]!.destroy();
            }
        }

        let renderCommands = this._renderCommands;
        renderCommands.length = 0;

        let hasCommand = false;
        let effects = this._effects;
        for (let ri = 0; ri < effects.length; ri++) {
            let renderer = effects[ri];
            if (!renderer || !renderer.enabled) {
                continue;
            }
            hasCommand = true;
            break;
        }

        if (!hasCommand) return;

        let pipeline = this._pipeline! as ForwardPipeline;

        const device = pipeline.device;
        let width = device.width, height = device.height;

        if (!this._originRenderTexture) {
            this._originRenderTexture = new RenderTexture();
            this._originRenderTexture.reset({ width, height, passInfo: _renderPassInfo })
        }

        this.postProcessCameraSetting.window = this._originRenderTexture.window!;

        let flip: RenderTexture | null = null, flop: RenderTexture | null = null, tmp: RenderTexture | null = null;
        let renderTextureMap: Map<string, RenderTexture> = new Map();

        for (let ri = 0; ri < effects.length; ri++) {
            let r = effects[ri];
            if (!r || !r.enabled) {
                continue;
            }

            let commands = r.commands;
            for (let ci = 0; ci < commands.length; ci++) {
                let command = commands[ci];
                let pass = command.pass;

                if (!pass) {
                    continue;
                }

                let originBinding = pass.getBinding('pe_origin_texture');
                if (originBinding) {
                    pass.bindSampler(originBinding, this._originRenderTexture.getGFXSampler());
                    pass.bindTexture(originBinding, this._originRenderTexture.getGFXTexture()!);
                }

                if (command.inputCommands) {
                    for (let ii = 0; ii < command.inputCommands.length; ii++) {
                        let inputName = command.inputCommands[ii].outputName;

                        let inputTexture = renderTextureMap.get(inputName);
                        if (!inputTexture) {
                            warn(`Can not find input frame buffer for input name [${inputName}] in post process renderer [${typeof renderer}]`);
                            continue;
                        }

                        let inputBinding = pass.getBinding(inputName);
                        if (inputBinding) {
                            pass.bindSampler(inputBinding, inputTexture.getGFXSampler());
                            pass.bindTexture(inputBinding, inputTexture.getGFXTexture()!);
                        }
                    }
                }

                let input = flip || this._originRenderTexture;

                let inputBinding = pass.getBinding('pe_input_texture');
                if (inputBinding) {
                    pass.bindSampler(inputBinding, input.getGFXSampler());
                    pass.bindTexture(inputBinding, input.getGFXTexture()!);
                }

                pass.update();

                if (!flop) {
                    flop = new RenderTexture();
                    flop.reset({ width, height, passInfo: _renderPassInfo })
                }

                renderCommands.push(new PostEffectRenderCommand(command.submodel!, pass, input, flop));

                if (command.outputName) {
                    renderTextureMap.set(command.outputName, flop);
                    flop = null;
                }

                tmp = flip;
                flip = flop;
                flop = tmp;
            }
        }

        // last command should output to screen
        if (renderCommands.length > 0) {
            renderCommands[renderCommands.length - 1].output = undefined;
        }
    }

    resize (width: number, height: number) {
        // if (this._originRenderTexture) {
        //     this._originRenderTexture.resize(width, height);
        // }
        // this.usedTextures.forEach(t => {
        //     t?.resize(width, height);
        // })

        if (this._originRenderTexture) {
            this._originRenderTexture.destroy();
            this._originRenderTexture = undefined;
        }
        this.rebuild();
    }
}

director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, () => {
    director.root!.pipeline.flows.forEach(flow => {
        let stage = flow.stages.find(s => s.name === "PostProcessStage") as PostProcessStage | undefined;
        if (stage) {
            stage.clear();
            return;
        }
    })
})
