const Lang = imports.lang;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Background = imports.ui.background;
const Tweener = imports.ui.tweener;
const Clutter = imports.gi.Clutter;

import * as Base from 'base';
import * as Constant from 'const';

export class FPlatformGnome extends Base.FPlatformBase {
    constructor() {
        super();
    }

    GetActionModeEnum(): object {
        return Shell.ActionMode;
    }

    GetPanels(): any {
        let panels = [Main.panel];

        if (Main.panel2) {
            panels.push(Main.panel2);
        }

        // gnome-shell dash
        if (Main.overview._dash) {
            panels.push(Main.overview._dash);
        }

        return panels;
    }

    GetActiveMonitor(): void {
        return Main.layoutManager.currentMonitor;
    }

    CreateBackgroundActor(): any {
        let Group = new Meta.BackgroundGroup();
        Main.layoutManager.uiGroup.add_child(Group);
        Main.uiGroup.set_child_below_sibling(Group, null);
        Group.hide();

        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            new Background.BackgroundManager({
                container: Group,
                monitorIndex: i,
                vignette: true
            });
        }

        return Group;
    }

    DimBackground(BackgroundGroup: any): void {
        BackgroundGroup.show();
        let backgrounds = BackgroundGroup.get_children();

        for (let i = 0; i < backgrounds.length; i++) {
            Tweener.addTween(backgrounds[i], {
                brightness: 0.8,
                vignette_sharpness: 1 - 0.2,
                time: 0.25,
                transition: 'easeOutCubic'
            });
        }
    }

    RevertBackgroundDim(BackgroundGroup: any, Callback: Function): void {
        let backgrounds = BackgroundGroup.get_children();
        for (let i = 0; i < backgrounds.length; i++) {
            Tweener.addTween(backgrounds[i], {
                brightness: 1.0,
                vignette_sharpness: 0.0,
                time: 0.25,
                transition: 'easeOutCubic',
                onComplete: Callback
            });
        }
    }

    SetPanelReactivity(New: boolean): void {
        let Panels = GExt.Platform.GetPanels();
        Panels.forEach((panel: any) => {
            try {
                let panelActor = (panel instanceof Clutter.Actor) ? panel : panel.actor;
                panelActor.set_reactive(New);
            } catch (e) {
                //ignore fake panels
            }
        }, this);
    }

    GetWindowTracker(): any {
        return imports.gi.Shell.WindowTracker.get_default();
    }

    BlurActor(Actor: any, Intensity: number, Brightness: number): any {
        Actor.add_effect_with_name('blur', new Shell.BlurEffect({
            mode: 0,
            brightness: Brightness,
            sigma: Intensity,
        }));
    }
}


export class FKeybinderGnome extends Base.FKeybinderBase {
    constructor(bindCallback: Function) {
        super();

        this.bindCallback = bindCallback;
    }

    bindCallback: Function

    enable(): void {
        this.BindAction(Constant.KeybindHandler.SWITCH_APPS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_WINDOWS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_GROUP, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_APPS_BACKWARDS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_WINDOWS_BACKWARDS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_GROUP_BACKWARDS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_PANELS, this.bindCallback);
    }

    disable() {
        const VanillaSwitcherCall = Lang.bind(Main.wm, Main.wm._startSwitcher);
        const VanillaSwitcherCallA11y = Lang.bind(Main.wm, Main.wm._startA11ySwitcher);

        this.BindAction(Constant.KeybindHandler.SWITCH_APPS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_WINDOWS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_GROUP, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_APPS_BACKWARDS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_WINDOWS_BACKWARDS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_GROUP_BACKWARDS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_PANELS, VanillaSwitcherCallA11y);
    }

    BindAction(bindType: Constant.KeybindHandler, callback: Function): void {
        const Mode = GExt.GetPlatform().GetActionModeEnum();
        Main.wm.setCustomKeybindingHandler(bindType, Mode.NORMAL, callback);
    }
};
