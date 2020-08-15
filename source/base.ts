import * as Constant from 'const';

export abstract class FKeybinderBase {
    constructor() { }

    abstract enable(): void;
    abstract disable(): void;

    abstract BindAction(bindType: Constant.KeybindHandler, callback: Function): void;
}

export abstract class FPlatformBase {
    constructor() { }

    enable() {
        throw new Error("Abstract method enable not implemented");
    }

    disable() {
        throw new Error("Abstract method disable not implemented");
    }

    abstract GetActionModeEnum(): object;
    abstract GetPanels(): any;
    abstract GetActiveMonitor(): any;
    abstract CreateBackgroundActor(): any;
    abstract DimBackground(BackgroundGroup: any): void;
    abstract RevertBackgroundDim(BackgroundGroup: any, Callback: Function): void;
}

export abstract class FExtensionBase {
    constructor() { }

    enable(): void { }
    disable(): void { }

    abstract GetPlatform(): FPlatformBase;
    abstract GetKeybindManager(): FKeybinderBase;
    abstract GetConfig(): FExtensionConfig;
}

export abstract class FExtensionConfig { }

export abstract class FWindowSwitcherBase {
    constructor() { }

    abstract Show(Windows: any, Mask: any, Index: number): void;
    abstract Hide(): void;
    abstract Destroy(): void;
}