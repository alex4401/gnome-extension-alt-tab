import * as Base from 'base';
import * as GNOME from 'gnome';
import * as Switcher from 'switcher';
import * as Timeline from 'timeline';
import * as Board from 'board';
import * as Utils from 'utilities';

const Clutter = imports.gi.Clutter;
const Lang = imports.lang;

enum SwitcherType {
    Timeline,
    Board,
}

class FExtensionConfigAltTab extends Base.FExtensionConfig {
    Switcher: SwitcherType = SwitcherType.Timeline;

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

    BoardRowLength: number = 4;
    BoardGridMargin: number = 25;
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

    GetSwitcherInstance(): Switcher.FWindowSwitcherCore<any> {
        switch (this.Config.Switcher) {
            case SwitcherType.Board:
                return new Board.FWindowSwitcherBoard();

            case SwitcherType.Timeline:
            default:
                return new Timeline.FWindowSwitcherTimeline();
        }
    }

    ShowWindowSwitcher(display: any, _window: any, binding: any): void {
        let windows: Meta.Window[] = [];
        let currentWorkspace = this.WorkspaceManager.get_active_workspace();

        // Construct a list with all windows
        const windowActors = global.get_window_actors();
        windowActors.forEach((actor: Meta.WindowActor) => {
            if (typeof actor.get_meta_window === 'function') {
                windows.push(actor.get_meta_window());
            }
        });

        // Switch by binding action
        switch (binding.get_name()) {
            case 'switch-panels':
                // Switch between windows of all workspaces
                windows = windows.filter(Utils.FWindowFilterUtils.MatchSkipTaskbar);
                // Sort by user time
                windows.sort(Utils.FWindowFilterUtils.SortWindowsByUserTime);
                break;
            case 'switch-group':
                // Switch between windows of same application from all workspaces
                const focused = display.focus_window ? display.focus_window : windows[0];
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

        // Display the switcher with a delay if windows have been
        // found.
        if (windows.length > 0) {
            let mask = binding.get_mask();
            let currentIndex = windows.indexOf(display.focus_window);

            const switcher = this.GetSwitcherInstance();
            switcher.ShowDelayed(this.Config.InitialDelay, windows, mask, currentIndex);
        }
    }
}