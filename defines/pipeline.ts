import { pipeline as _pipeline, getPhaseID as _getPhaseID } from 'cc';

let SetIndex, PipelineGlobalBindings, globalDescriptorSetLayout, bindingMappingInfo;

// fixed native
if (typeof _pipeline === 'undefined') {
    SetIndex = {} as any;
    PipelineGlobalBindings = {} as any;
    globalDescriptorSetLayout = {
        layouts: {},
        bindings: {}
    } as any;
    bindingMappingInfo = {
        samplerOffsets: []
    } as any;
}
else {
    SetIndex = _pipeline.SetIndex;
    PipelineGlobalBindings = _pipeline.PipelineGlobalBindings;
    globalDescriptorSetLayout = _pipeline.globalDescriptorSetLayout;
    bindingMappingInfo = _pipeline.bindingMappingInfo;
}


export const pipeline = {
    SetIndex,
    PipelineGlobalBindings,
    globalDescriptorSetLayout,
    bindingMappingInfo,
};


export function getPhaseID (phase: string | number) {
    if (_getPhaseID !== undefined) {
        return _getPhaseID(phase);
    }
    return 0;
}
