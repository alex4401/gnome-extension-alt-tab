const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Background = imports.ui.background;
const Clutter = imports.gi.Clutter;
const SwitcherPopup = imports.ui.switcherPopup;

import * as Base from 'base';
import * as Constant from 'const';

export class FPlatformGnome extends Base.FPlatformBase {
    constructor() {
        super();
    }

    Enable(): void { }
    Disable(): void { }

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
        if (!GExt.Config.AllowBackgroundAnimations) {
            return;
        }

        BackgroundGroup.show();
        let backgrounds = BackgroundGroup.get_children();

        for (let i = 0; i < backgrounds.length; i++) {
            backgrounds[i].ease({
                brightness: 0.8,
                vignette_sharpness: GExt.Config.Vignette,

                duration: GExt.Config.AnimationTime,
                delay: 0,
                mode: GExt.Config.TransitionType
            });
        }
    }

    RevertBackgroundDim(BackgroundGroup: any, Callback: Function): void {
        if (!GExt.Config.AllowBackgroundAnimations) {
            Callback();
            return;
        }

        let backgrounds = BackgroundGroup.get_children();
        for (let i = 0; i < backgrounds.length; i++) {
            backgrounds[i].ease({
                brightness: 1.0,
                vignette_sharpness: 0.0,

                duration: GExt.Config.AnimationTime,
                delay: 0,
                mode: GExt.Config.TransitionType,

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

    BlurActor(Actor: any, Intensity: number, Brightness: number): void {
        if (!GExt.Config.AllowBlur) {
            return;
        }

        Actor.add_effect_with_name('blur', new Shell.BlurEffect({
            mode: 0,
            brightness: Brightness,
            sigma: Intensity,
        }));
    }

    GetPrimaryModifier(Mask: any): any {
        return SwitcherPopup.primaryModifier(Mask);
    }
}


export class FKeybinderGnome extends Base.FKeybinderBase {
    constructor(bindCallback: Function) {
        super();

        this.bindCallback = bindCallback;
    }

    bindCallback: Function;

    Enable(): void {
        this.BindAction(Constant.KeybindHandler.SWITCH_APPS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_WINDOWS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_GROUP, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_APPS_BACKWARDS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_WINDOWS_BACKWARDS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_GROUP_BACKWARDS, this.bindCallback);
        this.BindAction(Constant.KeybindHandler.SWITCH_PANELS, this.bindCallback);
    }

    Disable() {
        const VanillaSwitcherCall = Main.wm._startSwitcher.bind(Main.wm);
        const VanillaSwitcherCallA11y = Main.wm._startA11ySwitcher.bind(Main.wm);

        this.BindAction(Constant.KeybindHandler.SWITCH_APPS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_WINDOWS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_GROUP, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_APPS_BACKWARDS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_WINDOWS_BACKWARDS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_GROUP_BACKWARDS, VanillaSwitcherCall);
        this.BindAction(Constant.KeybindHandler.SWITCH_PANELS, VanillaSwitcherCallA11y);
    }

    BindAction(bindType: Constant.KeybindHandler, callback: Function): void {
        Main.wm.setCustomKeybindingHandler(bindType, Shell.ActionMode.NORMAL, callback);
    }
};
