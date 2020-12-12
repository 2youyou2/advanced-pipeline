import { geometry, InstancedBuffer, Mat4, Material, Mesh } from 'cc';

type InstanceBundle = Map<string, InstancedBuffer>  // mesh and materials id
type InstancePhase = Map<number, InstanceBundle>    // phase

export class InstanceBlockData {

    blockName = '';

    _instances: InstancePhase = new Map;

    worldBound = new geometry.AABB
}
