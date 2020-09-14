import * as Base from 'base';
import * as GNOME from 'gnome';
import * as Timeline from 'timeline';
import * as Utils from 'utilities';

const Clutter = imports.gi.Clutter;
const Lang = imports.lang;

class FExtensionConfigAltTab extends Base.FExtensionConfig {
    AnimationTime: number = 150;
    TransitionType: number = Clutter.AnimationMode.EASE_IN_OUT_QUART;
    InitialDelay: number = 0.1;
    Vignette: number = 0.4;

    AllowBlur: boolean = true;
    BackgroundBlurStrength = 40;
    AllowBackgroundAnimations: boolean = true;

    TimelineAngle: number = 12;
    WindowPreviewScale: number = 0.45;
    WindowIconSize: number = 128;
}

export class FExtension implements Base.IExtensionBase {
    Platform: GNOME.FPlatformGnome;
    Keybinder: GNOME.FKeybinderGnome;
    Config: FExtensionConfigAltTab;

    WorkspaceManager: any;

    constructor() {
        this.Platform = new GNOME.FPlatformGnome();
        this.Keybinder = new GNOME.FKeybinderGnome(Lang.bind(this, this.ShowWindowSwitcher));
        this.Config = new FExtensionConfigAltTab();
        this.WorkspaceManager = global.workspace_manager;
    }

    Enable(): void {
        this.Platform.Enable();
        this.Keybinder.Enable();
    }

    Disable(): void {
        this.Platform.Disable();
        this.Keybinder.Disable();
    }

    GetPlatform(): GNOME.FPlatformGnome { return this.Platform; }
    GetKeybindManager(): GNOME.FKeybinderGnome { return this.Keybinder; }
    GetConfig(): Base.FExtensionConfig { return this.Config; }

    ShowWindowSwitcher(display: any, _window: any, binding: any): void {
        let windows: Meta.Window[] = [];
        let currentWorkspace = this.WorkspaceManager.get_active_workspace();

        // Construct a list with all windows
        const windowActors = global.get_window_actors();
        windowActors.forEach((actor: Meta.WindowActor) => {
            if (typeof actor.get_meta_window === 'function') {
                windows.push(actor.get_meta_window());
            } else {
                print('not meta_window');
            }
        });

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

            let switcher = new Timeline.FWindowSwitcherTimeline();
            switcher.ShowDelayed(this.Config.InitialDelay, windows, mask, currentIndex);
        }
    }
}