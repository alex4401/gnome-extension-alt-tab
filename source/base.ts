import * as Constant from 'const';

export abstract class FKeybinderBase {
    constructor() { }

    abstract Enable(): void;
    abstract Disable(): void;
    abstract BindAction(bindType: Constant.KeybindHandler, callback: Function): void;
}

export abstract class FPlatformBase {
    constructor() { }

    abstract Enable(): void;
    abstract Disable(): void;
    abstract GetActionModeEnum(): object;
    abstract GetPanels(): any;
    abstract GetActiveMonitor(): any;
    abstract CreateBackgroundActor(): any;
    abstract DimBackground(BackgroundGroup: any): void;
    abstract RevertBackgroundDim(BackgroundGroup: any, Callback: Function): void;
}

export interface IExtensionBase {
    Platform: FPlatformBase;
    Keybinder: FKeybinderBase;
    Config: FExtensionConfig;

    Enable(): void;
    Disable(): void;
    GetPlatform(): FPlatformBase;
    GetKeybindManager(): FKeybinderBase;
    GetConfig(): FExtensionConfig;
}

export abstract class FExtensionConfig { }

export abstract class FWindowSwitcherBase {
    constructor() { }

    abstract Show(Windows: any, Mask: any, Index: number): void;
    abstract Hide(): void;
    abstract Destroy(): void;
}