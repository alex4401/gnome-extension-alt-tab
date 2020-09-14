import * as Impl from 'extension_impl';

let ExtObject: Impl.FExtension;

export function init() {
    ExtObject = new Impl.FExtension();
}

export function enable() {
    ExtObject.Enable();
}

export function disable() {
    ExtObject.Disable();
}

export function GetGExt(): Impl.FExtension {
    return ExtObject;
}