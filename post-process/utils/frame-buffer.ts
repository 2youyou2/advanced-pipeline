import { GFXTextureViewType, GFXTextureUsageBit, GFXTextureType, GFXFormat, GFXDevice, RenderPipeline } from "cc";

export function createFrameBuffer (pipeline: RenderPipeline, device: GFXDevice, depth = false, scale = 1) {
    let pipelineAny = pipeline as any;


    // @ts-ignore
    let shadingWidth = pipelineAny._shadingWidth * scale;
    let shadingHeight = pipelineAny._shadingHeight * scale;
    if (CC_EDITOR) {
        shadingWidth = device.width;
        shadingHeight = device.height;
    }

    let format: GFXFormat = pipelineAny._getTextureFormat(GFXFormat.UNKNOWN, GFXTextureUsageBit.COLOR_ATTACHMENT);
    let texture = device.createTexture({
        type: GFXTextureType.TEX2D,
        usage: GFXTextureUsageBit.COLOR_ATTACHMENT,
        format: format,
        width: shadingWidth,
        height: shadingHeight,
    })

    let textureView = device.createTextureView({
        texture: texture,
        type: GFXTextureViewType.TV2D,
        format: format,
    })

    // depth stencil
    let depthTextureView = null;
    if (depth) {
        let depthFormat: GFXFormat = pipelineAny._getTextureFormat(GFXFormat.UNKNOWN, GFXTextureUsageBit.DEPTH_STENCIL_ATTACHMENT);

        let depthTexture = device.createTexture({
            type: GFXTextureType.TEX2D,
            usage: GFXTextureUsageBit.DEPTH_STENCIL_ATTACHMENT,
            format: depthFormat,
            width: shadingWidth,
            height: shadingHeight,
        })
        depthTextureView = device.createTextureView({
            texture: depthTexture,
            type: GFXTextureViewType.TV2D,
            format: depthFormat,
        })
    }
    

    // framebuffer
    let frameBuffer = device.createFramebuffer({
        renderPass: pipelineAny._renderPasses.get(1),
        colorViews: [textureView],
        depthStencilView: depthTextureView,
    })

    return frameBuffer;
}