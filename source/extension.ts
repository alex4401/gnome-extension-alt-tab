import * as Base from 'base';
import * as GNOME from 'gnome';
import * as Switchers from 'switcher';
import * as Utils from 'utilities';

const Lang = imports.lang;

class FExtensionConfigAltTab extends Base.FExtensionConfig {
    AnimationTime: number = 0.15
    TransitionType: string = "easeOutBack"
    InitialDelay: number = 0.15
    Vignette: number = 0.4

    AllowBlur: boolean = false
    BackgroundBlurStrength = 40
    AllowBackgroundAnimations: boolean = true

    TimelineAngle: number = 12
    WindowPreviewScale: number = 0.45
    WindowIconSize: number = 128
}

class FExtensionAltTab extends Base.FExtensionBase {
    Platform: GNOME.FPlatformGnome
    keybinder: GNOME.FKeybinderGnome
    Config: FExtensionConfigAltTab

    WorkspaceManager: any

    constructor() {
        super();

        this.Platform = new GNOME.FPlatformGnome();
        this.keybinder = new GNOME.FKeybinderGnome(Lang.bind(this, this.ShowWindowSwitcher));
        this.Config = new FExtensionConfigAltTab();
        this.WorkspaceManager = global.workspace_manager;
    }

    enable(): void {
        this.keybinder.enable();
    }
    disable(): void {
        this.keybinder.disable();
    }

    GetPlatform(): GNOME.FPlatformGnome { return this.Platform; }
    GetKeybindManager(): GNOME.FKeybinderGnome { return this.keybinder }
    GetConfig(): Base.FExtensionConfig { return this.Config; }

    ShowWindowSwitcher(display: any, _window: any, binding: any): void {
        let windows = [];
        let currentWorkspace = this.WorkspaceManager.get_active_workspace();

        // Construct a list with all windows
        let windowActors = global.get_window_actors();
        for (let i in windowActors) {
            if (typeof windowActors[i].get_meta_window === 'function') {
                windows.push(windowActors[i].get_meta_window());
            }
        }

        windowActors = null;

        switch (binding.get_name()) {
            case 'switch-panels':
                // Switch between windows of all workspaces
                windows = windows.filter(Utils.FWindowFilterUtils.MatchSkipTaskbar);
                // Sort by user time
                windows.sort(Utils.FWindowFilterUtils.SortWindowsByUserTime);
                break;
            case 'switch-group':
                // Switch between windows of same application from all workspaces
                let focused = display.focus_window ? display.focus_window : windows[0];
                windows = windows.filter(Utils.FWindowFilterUtils.MatchWmClass, focused.get_wm_class());
                // Sort by user time
                windows.sort(Utils.FWindowFilterUtils.SortWindowsByUserTime);
                break;
            default:
                // Switch between windows of all workspaces, prefer
                // those from current workspace
                let wins1 = windows.filter(Utils.FWindowFilterUtils.MatchWorkspace, currentWorkspace);
                let wins2 = windows.filter(Utils.FWindowFilterUtils.MatchOtherWorkspace, currentWorkspace);
                // Sort by user time
                wins1.sort(Utils.FWindowFilterUtils.SortWindowsByUserTime);
                wins2.sort(Utils.FWindowFilterUtils.SortWindowsByUserTime);
                windows = wins1.concat(wins2);
                wins1 = [];
                wins2 = [];
                break;
        }

        if (windows.length) {
            let mask = binding.get_mask();
            let currentIndex = windows.indexOf(display.focus_window);

            let switcher = new Switchers.FWindowSwitcherTimeline();
            switcher.ShowDelayed(this.Config.InitialDelay, windows, mask, currentIndex);
        }
    }
}

let ExtObject: FExtensionAltTab;

export function init() {
    ExtObject = new FExtensionAltTab();
}

export function enable() {
    ExtObject.enable();
}

export function disable() {
    ExtObject.disable();
}

export function GetGExt(): FExtensionAltTab {
    return ExtObject;
}