import { InstanceObject } from './instance-object';

export class InstanceManager {
    static _instance: InstanceManager;
    static get instance () {
        if (!this._instance) {
            this._instance = new InstanceManager;
        }
        return this._instance;
    }

    objects: InstanceObject[] = [];

    addObject (object: InstanceObject) {
        if (this.objects.indexOf(object) === -1) {
            this.objects.push(object);
        }
    }
    removeObject (object: InstanceObject) {
        let index = this.objects.indexOf(object);
        if (index !== -1) {
            this.objects.splice(index, 1);
        }
    }
}

globalThis.InstanceManager = InstanceManager;
