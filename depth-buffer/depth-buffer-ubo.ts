import { GFXUniformBlock, pipeline, GFXType } from "cc";

export class UBOLitShadow {

    public static LIT_SHADOW_MAT_VIEW_PROJ_OFFSET: number = 0;
    public static LIT_SHADOW_PARAMS: number = UBOLitShadow.LIT_SHADOW_MAT_VIEW_PROJ_OFFSET + 16;
    public static COUNT: number = UBOLitShadow.LIT_SHADOW_PARAMS + 4;
    public static SIZE: number = UBOLitShadow.COUNT * 4;

    public static BLOCK: GFXUniformBlock = {
        binding: 0, name: 'SL_LIT_SHADOW', members: [
            { name: 'sl_litShadowMatViewProj', type: GFXType.MAT4, count: 1 },
            { name: 'sl_litShadowParams', type: GFXType.FLOAT4, count: 1 },
        ],
    };

    public view: Float32Array = new Float32Array(UBOLitShadow.COUNT);
}
