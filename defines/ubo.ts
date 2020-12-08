import { GFXUniformSampler, GFXDescriptorSetLayoutBinding, GFXDescriptorType, GFXShaderStageFlagBit, GFXUniformBlock, GFXUniform, GFXType } from "cc";
import { pipeline } from './pipeline';

const { SetIndex, PipelineGlobalBindings, globalDescriptorSetLayout, bindingMappingInfo } = pipeline;

let BindingStart = PipelineGlobalBindings.COUNT;
let BindingIndex = 0;

export class UBOGrassBend {
    public static UVOffset: number = 0;
    public static COUNT: number = UBOGrassBend.UVOffset + 4;
    public static SIZE: number = UBOGrassBend.COUNT * 4;

    public static readonly NAME = 'CCGrassBend';
    public static readonly BINDING = BindingStart + BindingIndex++;
    public static readonly DESCRIPTOR = new GFXDescriptorSetLayoutBinding(UBOGrassBend.BINDING, GFXDescriptorType.UNIFORM_BUFFER, 1, GFXShaderStageFlagBit.ALL);

    public static readonly LAYOUT = new GFXUniformBlock(SetIndex.GLOBAL, UBOGrassBend.BINDING, UBOGrassBend.NAME, [
        new GFXUniform('cc_grass_bend_uv', GFXType.FLOAT4, 1),
    ], 1)
}
globalDescriptorSetLayout.layouts[UBOGrassBend.NAME] = UBOGrassBend.LAYOUT;
globalDescriptorSetLayout.bindings[UBOGrassBend.BINDING] = UBOGrassBend.DESCRIPTOR;


export class UBOCustomCommon {
    public static ProjectionParamsOffset: number = 0;
    public static COUNT: number = UBOCustomCommon.ProjectionParamsOffset + 4;
    public static SIZE: number = UBOCustomCommon.COUNT * 4;

    public static readonly NAME = 'CCCustomCommon';
    public static readonly BINDING = BindingStart + BindingIndex++;
    public static readonly DESCRIPTOR = new GFXDescriptorSetLayoutBinding(UBOCustomCommon.BINDING, GFXDescriptorType.UNIFORM_BUFFER, 1, GFXShaderStageFlagBit.ALL);

    public static readonly LAYOUT = new GFXUniformBlock(SetIndex.GLOBAL, UBOCustomCommon.BINDING, UBOCustomCommon.NAME, [
        new GFXUniform('cc_projection_params', GFXType.FLOAT4, 1),
    ], 1)
}
globalDescriptorSetLayout.layouts[UBOCustomCommon.NAME] = UBOCustomCommon.LAYOUT;
globalDescriptorSetLayout.bindings[UBOCustomCommon.BINDING] = UBOCustomCommon.DESCRIPTOR;


export const UNIFORM_GRASS_BEND_MAP_BINDING = BindingStart + BindingIndex++;
export const UNIFORM_GRASS_BEND_MAP_NAME = 'cc_grass_bend_map'
export const UNIFORM_GRASS_BEND_MAP_LAYOUT = new GFXUniformSampler(SetIndex.GLOBAL, UNIFORM_GRASS_BEND_MAP_BINDING, UNIFORM_GRASS_BEND_MAP_NAME, GFXType.SAMPLER2D, 1);
export const UNIFORM_GRASS_BEND_MAP_DESCRIPTOR = new GFXDescriptorSetLayoutBinding(UNIFORM_GRASS_BEND_MAP_BINDING, GFXDescriptorType.SAMPLER, 1, GFXShaderStageFlagBit.FRAGMENT);
globalDescriptorSetLayout.layouts[UNIFORM_GRASS_BEND_MAP_NAME] = UNIFORM_GRASS_BEND_MAP_LAYOUT;
globalDescriptorSetLayout.bindings[UNIFORM_GRASS_BEND_MAP_BINDING] = UNIFORM_GRASS_BEND_MAP_DESCRIPTOR;

export const UNIFORM_DEPTH_BUFFER_MAP_BINDING = BindingStart + BindingIndex++;
export const UNIFORM_DEPTH_BUFFER_MAP_NAME = 'cc_depth_buffer_map';
export const UNIFORM_DEPTH_BUFFER_MAP_LAYOUT = new GFXUniformSampler(SetIndex.GLOBAL, UNIFORM_DEPTH_BUFFER_MAP_BINDING, UNIFORM_DEPTH_BUFFER_MAP_NAME, GFXType.SAMPLER2D, 1);
export const UNIFORM_DEPTH_BUFFER_MAP_DESCRIPTOR = new GFXDescriptorSetLayoutBinding(UNIFORM_DEPTH_BUFFER_MAP_BINDING, GFXDescriptorType.SAMPLER, 1, GFXShaderStageFlagBit.FRAGMENT);
globalDescriptorSetLayout.layouts[UNIFORM_DEPTH_BUFFER_MAP_NAME] = UNIFORM_DEPTH_BUFFER_MAP_LAYOUT;
globalDescriptorSetLayout.bindings[UNIFORM_DEPTH_BUFFER_MAP_BINDING] = UNIFORM_DEPTH_BUFFER_MAP_DESCRIPTOR;


// final
bindingMappingInfo.samplerOffsets[1] += BindingIndex;
bindingMappingInfo.samplerOffsets[2] += BindingIndex;
