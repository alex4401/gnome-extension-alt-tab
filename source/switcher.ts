import * as Base from 'base';

const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const GLib = imports.gi.GLib;

export interface IWindowPreviewHolder {
    CloneActor: Clutter.Clone;
}


export abstract class FWindowSwitcherCore<T extends IWindowPreviewHolder>
    extends Base.FWindowSwitcherBase {

    Actor: any;
    PreviewActor: any;
    BackgroundGroup: any;

    WindowPreviews: T[] = [];

    bIsActivated: boolean = false;
    Windows: any;
    CurrentIndex: number = 0;
    ModifierMask: any;
    InitialDelayTimeoutId: number = 0;

    constructor() {
        super();
        this.CreateContainers();
    }

    CreateContainers(): void {
        this.BackgroundGroup = GExt.Platform.CreateBackgroundActor();
        GExt.Platform.BlurActor(this.BackgroundGroup, GExt.Config.BackgroundBlurStrength, 1);

        this.Actor = new St.Widget({ visible: true, reactive: true, });
        this.Actor.hide();
        this.PreviewActor = new St.Widget({ visible: true, reactive: true });
        this.Actor.add_actor(this.PreviewActor);
        Main.uiGroup.add_actor(this.Actor);

        this.Actor.connect('key-press-event', Lang.bind(this, this.HandleKeyPressed));
        this.Actor.connect('key-release-event', Lang.bind(this, this.HandleKeyReleased));
    }

    ShowDelayed(Delay: number, Windows: any, Mask: any, Index: number): void {
        if (this.bIsActivated) {
            return;
        }

        if (Delay <= 0.01) {
            this.Show(Windows, Mask, Index);
            return;
        }

        this.ModifierMask = GExt.Platform.GetPrimaryModifier(Mask);
        this.InitialDelayTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, Delay, () => {
            this.Show(Windows, Mask, Index);
            return false;
        });

        Main.pushModal(this.Actor);

        this.Windows = Windows;
        this.CurrentIndex = Index;
    }

    Show(Windows: any, Mask: any, Index: number): void {
        if (this.bIsActivated) {
            return;
        }

        this.ModifierMask = GExt.Platform.GetPrimaryModifier(Mask);

        let monitor = GExt.Platform.GetActiveMonitor();
        this.Actor.set_position(monitor.x, monitor.y);
        this.Actor.set_size(monitor.width, monitor.height);
        this.CreateWindowPreviews(Windows, Mask, Index);

        global.window_group.hide();
        this.Actor.show();
        this.Actor.set_reactive(true);
        GExt.Platform.SetPanelReactivity(false);
        GExt.Platform.DimBackground(this.BackgroundGroup);

        if (this.InitialDelayTimeoutId == 0) {
            Main.pushModal(this.Actor);
        }

        this.bIsActivated = true;
        this.Windows = Windows;
        this.CurrentIndex = Index;
        this.NextWindow();

        this.InitialDelayTimeoutId = 0;
    }

    Hide(): void {
        this.Actor.set_reactive(false);

        Main.popModal(this.Actor);
        GExt.Platform.SetPanelReactivity(true);

        if (this.InitialDelayTimeoutId == 0) {
            GExt.Platform.RevertBackgroundDim(this.BackgroundGroup, Lang.bind(this, this.FinishHiding));
        }
    }

    FinishHiding(): void {
        this.BackgroundGroup.hide();
        this.Actor.hide();

        // Destroy all existing window clones
        this.WindowPreviews.forEach((holder: IWindowPreviewHolder) => {
            holder.CloneActor.destroy();
        });
        this.WindowPreviews = [];

        global.window_group.show();
    }

    Destroy(): void {

    }

    HandleKeyPressed(_Actor: any, Event: any): boolean {
        switch (Event.get_key_symbol()) {
            case Clutter.KEY_Escape:
                this.Hide();
                return true;

            case Clutter.KEY_Right:
            case Clutter.KEY_Down:
                // Right/Down -> navigate to next preview
                this.NextWindow();
                return true;

            case Clutter.KEY_Left:
            case Clutter.KEY_Up:
                // Left/Up -> navigate to previous preview
                this.PreviousWindow();
                return true;
        }

        let event_state = Event.get_state();
        let action = global.display.get_keybinding_action(Event.get_key_code(), event_state);
        switch (action) {
            case Meta.KeyBindingAction.SWITCH_APPLICATIONS:
            case Meta.KeyBindingAction.SWITCH_GROUP:
            case Meta.KeyBindingAction.SWITCH_WINDOWS:
            case Meta.KeyBindingAction.SWITCH_PANELS:
                // shift -> backwards
                if (event_state & Clutter.ModifierType.SHIFT_MASK) {
                    this.PreviousWindow();
                }
                else {
                    this.NextWindow();
                }
                return true;

            case Meta.KeyBindingAction.SWITCH_APPLICATIONS_BACKWARD:
            case Meta.KeyBindingAction.SWITCH_GROUP_BACKWARD:
            case Meta.KeyBindingAction.SWITCH_WINDOWS_BACKWARD:
            case Meta.KeyBindingAction.SWITCH_PANELS_BACKWARD:
                this.PreviousWindow();
                return true;
        }

        return true;
    }

    HandleKeyReleased(_Actor: any, _Event: any): boolean {
        let [, , mods] = global.get_pointer();
        let state = mods & this.ModifierMask;

        if (state == 0) {
            if (this.InitialDelayTimeoutId != 0) {
                this.CurrentIndex = (this.CurrentIndex + 1) % this.Windows.length;
                GLib.source_remove(this.InitialDelayTimeoutId);
            }

            this.FocusWindow();
        }

        return true;
    }

    NextWindow() {
        if (this.Windows.length <= 1) {
            this.CurrentIndex = 0;
            this.UpdateWindowPreviews(0);
        } else {
            this.Actor.set_reactive(false);
            this.PreviewNextWindow();
            this.Actor.set_reactive(true);
        }

        this.SetShownWindowTitle(this.Windows[this.CurrentIndex]);
    }

    PreviousWindow() {
        if (this.Windows.length <= 1) {
            this.CurrentIndex = 0;
            this.UpdateWindowPreviews(0);
        } else {
            this.Actor.set_reactive(false);
            this.PreviewPreviousWindow();
            this.Actor.set_reactive(true);
        }

        this.SetShownWindowTitle(this.Windows[this.CurrentIndex]);
    }

    FocusWindow() {
        Main.activateWindow(this.Windows[this.CurrentIndex], global.get_current_time());;
        this.Hide();
    }

    abstract CreateWindowPreviews(Windows: any, Mask: any, Index: number): void;
    abstract SetShownWindowTitle(Window: any): void;
    abstract UpdateWindowPreviews(Index: number): void;
    abstract PreviewNextWindow(): void;
    abstract PreviewPreviousWindow(): void;
}