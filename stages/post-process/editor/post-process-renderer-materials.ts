// @ts-nocheck

import { ccenum, Material, AssetLibrary, game, Game, assetManager, error } from "cc";
import { fse, globby, path, projectPath } from '../../../utils/editor';

let postProcessMaterials: Map<string, Material> = new Map;

function load (name: string, uuid: string) {
    game.on(Game.EVENT_ENGINE_INITED, () => {
        assetManager.loadAny(uuid, (err, asset) => {
            if (err) {
                error(err);
                return;
            }
            postProcessMaterials.set(name, asset);
        })
    })
}

if (CC_EDITOR) {
    let postProcessMaterialPaths = globby.sync(path.join(projectPath, '**/post-process/**/*.mtl'));
    for (let i = 0; i < postProcessMaterialPaths.length; i++) {
        let mp = postProcessMaterialPaths[i];
        let name = path.basename(mp).replace(path.extname(mp), '');

        let metaPath = mp + '.meta';
        if (!fse.existsSync(metaPath)) {
            continue;
        }
        let json;
        try {
            json = fse.readJSONSync(metaPath);
        }
        catch (err) {
            error(err);
        }
        if (!json) {
            continue;
        }
        postProcessMaterials.set(name, null);

        let uuid = json.uuid;
        load(name, uuid);
    }
}

export default postProcessMaterials;
