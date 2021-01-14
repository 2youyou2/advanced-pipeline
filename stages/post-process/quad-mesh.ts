import { Mesh, utils } from 'cc';

let _quadMesh: Mesh;
let _reverseQuadMesh: Mesh;

export function getMesh (reverse: boolean) {
    if (!reverse) {
        if (!_reverseQuadMesh) {
            _reverseQuadMesh = utils.createMesh({
                positions: [
                    -1, -1, 0, 1, -1, 0,
                    -1, 1, 0, 1, 1, 0,
                ],
                uvs: [
                    0, 1, 1, 1,
                    0, 0, 1, 0
                ],
                indices: [
                    0, 1, 2, 1, 3, 2
                ]
            });
        }
        return _reverseQuadMesh;
    }
    else {
        if (!_quadMesh) {
            _quadMesh = utils.createMesh({
                positions: [
                    -1, -1, 0, 1, -1, 0,
                    -1, 1, 0, 1, 1, 0,
                ],
                uvs: [
                    0, 0, 1, 0,
                    0, 1, 1, 1
                ],
                indices: [
                    0, 1, 2, 1, 3, 2
                ]
            });
        }
        return _quadMesh;
    }
}