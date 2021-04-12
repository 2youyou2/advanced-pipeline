import { director, ForwardPipeline, GFXFeature, _decorator } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('AdvancedPipeline')
export class AdvancedPipeline extends ForwardPipeline {

    @property
    usePostProcess = true;

    _isHDR = false;
    _isHDRSupported = false;

    activate (): boolean {
        let device = this._device || director.root?.device;
        if (device.hasFeature(GFXFeature.FORMAT_R11G11B10F) ||
            device.hasFeature(GFXFeature.TEXTURE_HALF_FLOAT) ||
            device.hasFeature(GFXFeature.TEXTURE_FLOAT)) {
            this._isHDRSupported = true;
        }

        // this._isHDR = this._isHDRSupported;

        let res = super.activate();

        this.macros.CC_USE_HDR = this._isHDRSupported && this.usePostProcess;

        return res;
    }


}
