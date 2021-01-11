import { _decorator, renderer, GFXPipelineState, GFXCommandBuffer, GFXFramebuffer, pipeline, GFXColor, ForwardStage, ForwardPipeline, RenderTexture, GFXRect, __private, warn, GFXColorAttachment, GFXTextureLayout, GFXDepthStencilAttachment, GFXRenderPassInfo, gfx, GFXFilter, GFXAddress, PipelineStateManager } from "cc";
import { UNIFORM_PE_INPUT_MAP_BINDING, UNIFORM_PE_ORIGIN_MAP_BINDING, UNIFORM_PE_CUSTOM_1_MAP_BINDING, UNIFORM_PE_CUSTOM_2_MAP_BINDING } from '../../defines/ubo';
import PostProcessRenderer from "./post-process-renderer";

const { UBOGlobal, SetIndex } = pipeline;
const { DSPool, ShaderPool } = renderer;
const { ccclass, property } = _decorator;

class PostEffectRenderCommand {
    pass: renderer.Pass | undefined;
    input: RenderTexture | undefined;
    output: RenderTexture | undefined;

    subModel: renderer.scene.SubModel | undefined;
    subModelIndex = -1;

    constructor (pass: renderer.Pass, input: RenderTexture, output: RenderTexture) {
        this.pass = pass;
        this.input = input;
        this.output = output;
    }
}

const _colors: GFXColor[] = [{ x: 0, y: 0, z: 0, w: 1 }];
const _transparentClearColor: GFXColor[] = [{ x: 0, y: 0, z: 0, w: 0 }];

const _colorAttachment = new GFXColorAttachment();
_colorAttachment.endLayout = GFXTextureLayout.SHADER_READONLY_OPTIMAL;
_colorAttachment.format = gfx.Format.RGBA16F;
const _depthStencilAttachment = new GFXDepthStencilAttachment();
const _renderPassInfo = new GFXRenderPassInfo([_colorAttachment], _depthStencilAttachment);

@ccclass("PostProcessStage")
export class PostProcessStage extends ForwardStage {

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    private _renderArea: GFXRect = { x: 0, y: 0, width: 0, height: 0 };

    render (camera: renderer.scene.Camera) {
        const pipeline = this._pipeline as ForwardPipeline;
        const cmdBuff = pipeline.commandBuffers[0];
        const device = pipeline.device;

        // draw main
        _colors[0].x = camera.clearColor.x;
        _colors[0].y = camera.clearColor.y;
        _colors[0].z = camera.clearColor.z;
        _colors[0].w = camera.clearColor.w;

        const vp = camera.viewport;
        const window = camera.window! as any as __private.cocos_core_renderer_core_render_window_RenderWindow;

        // draw post process
        let commands = this._renderCommands;
        if (commands.length !== 0) {
            let pipeline = this._pipeline!;

            for (let i = 0; i < commands.length; i++) {
                let renderTexture = commands[i].output;
                let framebuffer = renderTexture?.window!.framebuffer;

                this._renderArea!.width = camera.width;
                this._renderArea!.height = camera.height;

                if (!framebuffer) {
                    framebuffer = window.framebuffer;

                    this._renderArea!.x = vp.x * camera.width;
                    this._renderArea!.y = vp.y * camera.height;
                    this._renderArea!.width *= vp.width;
                    this._renderArea!.height *= vp.height;

                    const renderPass = framebuffer.colorTextures[0] ? framebuffer.renderPass : (pipeline as ForwardPipeline).getRenderPass(camera.clearFlag);
                    cmdBuff.beginRenderPass(renderPass, framebuffer, this._renderArea!,
                        _colors, camera.clearDepth, camera.clearStencil);
                }
                else {
                    this._renderArea!.x = 0;
                    this._renderArea!.y = 0;

                    const renderPass = framebuffer.colorTextures[0] ? framebuffer.renderPass : (pipeline as ForwardPipeline).getRenderPass(camera.clearFlag);
                    cmdBuff.beginRenderPass(renderPass, framebuffer, this._renderArea!,
                        _transparentClearColor, 1.0, 0);
                }

                let pass = commands[i].pass!;
                let subModel = commands[i].subModel!;
                let subModelIndex = commands[i].subModelIndex!;

                let ia = subModel.inputAssembler;
                const shader = ShaderPool.get(renderer.SubModelPool.get(subModel.handle, renderer.SubModelView.SHADER_0 + subModelIndex) as renderer.ShaderHandle);
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

    _renderers: PostProcessRenderer[] = [];
    get renderers () {
        return this._renderers;
    }
    set renderers (value) {
        this._renderers = value;
        this.rebuild();
    }

    _renderCommands: PostEffectRenderCommand[] = [];

    update (renderers: PostProcessRenderer[]) {
        this._renderers = renderers;
        this.rebuild();
    }

    clear () {
        this._renderers.length = 0;
        this._renderCommands.length = 0;
    }

    _originRenderTexture: RenderTexture | undefined;
    rebuild () {
        let frameBuffersToDestroy: (RenderTexture | undefined)[] = [];
        let renderCommands = this._renderCommands;
        for (let i = 0; i < renderCommands.length; i++) {
            if (renderCommands[i].input && !frameBuffersToDestroy.includes(renderCommands[i].input)) {
                if (renderCommands[i].input !== this._originRenderTexture) {
                    frameBuffersToDestroy.push(renderCommands[i].input)
                }
            }
            if (renderCommands[i].output && !frameBuffersToDestroy.includes(renderCommands[i].output)) {
                frameBuffersToDestroy.push(renderCommands[i].output)
            }
        }
        renderCommands.length = 0;
        for (let i = 0; i < frameBuffersToDestroy.length; i++) {
            if (frameBuffersToDestroy[i]) {
                frameBuffersToDestroy[i]!.destroy();
            }
        }

        let hasCommand = false;
        let renderers = this._renderers;
        for (let ri = 0; ri < renderers.length; ri++) {
            let renderer = renderers[ri];
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

        let flip: RenderTexture | null = null, flop: RenderTexture | null = null, tmp: RenderTexture | null = null;
        let renderTextureMap: Map<string, RenderTexture> = new Map();

        for (let ri = 0; ri < renderers.length; ri++) {
            let r = renderers[ri];
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

                let originSampler = pass.getBinding('pe_origin_texture');
                if (originSampler) {
                    pass.descriptorSet.bindSampler(UNIFORM_PE_ORIGIN_MAP_BINDING, this._originRenderTexture.getGFXSampler());
                    pass.descriptorSet.bindTexture(UNIFORM_PE_ORIGIN_MAP_BINDING, this._originRenderTexture.getGFXTexture()!);
                }

                if (command.inputCommands) {
                    for (let ii = 0; ii < command.inputCommands.length; ii++) {
                        let inputName = command.inputCommands[ii].outputName;
                        let inputTexture = pass.getBinding(inputName);
                        if (!inputTexture) {
                            warn(`Can not find input name [${inputName}] for post process renderer [${typeof renderer}]`);
                            continue;
                        }

                        let renderTexture = renderTextureMap.get(inputName);
                        if (!renderTexture) {
                            warn(`Can not find input frame buffer for input name [${inputName}] in post process renderer [${typeof renderer}]`);
                            continue;
                        }

                        let binding = -1;
                        if (inputName === 'pe_custom_texture_1') {
                            binding = UNIFORM_PE_CUSTOM_1_MAP_BINDING;
                        }
                        else if (inputName === 'pe_custom_texture_2') {
                            binding = UNIFORM_PE_CUSTOM_1_MAP_BINDING;
                        }

                        if (binding == -1) {
                            warn(`Can not find binding for input name [${inputName}]`);
                            continue;
                        }

                        pass.descriptorSet.bindSampler(binding, renderTexture.getGFXSampler());
                        pass.descriptorSet.bindTexture(binding, renderTexture.getGFXTexture()!);
                    }
                }

                let input = flip || this._originRenderTexture;

                let inputSampler = pass.getBinding('pe_input_texture');
                if (inputSampler) {
                    pass.descriptorSet.bindSampler(UNIFORM_PE_ORIGIN_MAP_BINDING, input.getGFXSampler());
                    pass.descriptorSet.bindTexture(UNIFORM_PE_ORIGIN_MAP_BINDING, input.getGFXTexture()!);
                }

                if (!flop) {
                    flop = new RenderTexture();
                    this._originRenderTexture.reset({ width, height, passInfo: _renderPassInfo })
                }

                renderCommands.push(new PostEffectRenderCommand(pass, input, flop));

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
        if (this._originRenderTexture) {
            this._originRenderTexture.destroy();
            this._originRenderTexture = undefined;
        }
        this.rebuild();
    }
}

// director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, () => {
//     let flow = director.root.pipeline.getFlow('PostProcessFlow');
//     if (flow) {
//         let stage = flow.stages.find(s => s instanceof PostProcessStage) as PostProcessStage;
//         if (stage) {
//             stage.clear();
//         }
//     }
// })
