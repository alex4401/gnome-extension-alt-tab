import * as Base from 'base';

const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const GLib = imports.gi.GLib;


export enum Placement {
    TOP = 1,
    TOP_RIGHT = 2,
    RIGHT = 3,
    BOTTOM_RIGHT = 4,
    BOTTOM = 5,
    BOTTOM_LEFT = 6,
    LEFT = 7,
    TOP_LEFT = 8,
    CENTER = 9,
}

export class FWindowPreview {
    Actor: Clutter.Clone

    constructor(args: any) {
        this.Actor = new Clutter.Clone(args);
    }

    makeTopLayer(parent: any) {
        parent.set_child_above_sibling(this.Actor, null);
    }

    makeBottomLayer(parent: any) {
        parent.set_child_below_sibling(this.Actor, null);
    }

    setPivotPointPlacement(placement: Placement) {
        let xFraction = 0,
            yFraction = 0;

        // Set xFraction
        switch (placement) {
            case Placement.TOP_LEFT:
            case Placement.LEFT:
            case Placement.BOTTOM_LEFT:
                xFraction = 0;
                break;

            case Placement.TOP:
            case Placement.CENTER:
            case Placement.BOTTOM:
                xFraction = 0.5;
                break;

            case Placement.TOP_RIGHT:
            case Placement.RIGHT:
            case Placement.BOTTOM_RIGHT:
                xFraction = 1;
                break;

            default:
                throw new Error("Unknown placement given");
        }

        // Set yFraction
        switch (placement) {
            case Placement.TOP_LEFT:
            case Placement.TOP:
            case Placement.TOP_RIGHT:
                yFraction = 0;
                break;

            case Placement.LEFT:
            case Placement.CENTER:
            case Placement.RIGHT:
                yFraction = 0.5;
                break;

            case Placement.BOTTOM_LEFT:
            case Placement.BOTTOM:
            case Placement.BOTTOM_RIGHT:
                yFraction = 1;
                break;

            default:
                throw new Error("Unknown placement given");
        }

        this.Actor.set_pivot_point(xFraction, yFraction);
    }
}

export abstract class FWindowSwitcherCore<T extends FWindowPreview>
    extends Base.FWindowSwitcherBase {

    Actor!: St.Widget;
    PreviewActor!: St.Widget;
    BackgroundGroup: any;

    WindowPreviews: T[] = [];

    bIsActivated: boolean = false;
    Windows: Meta.Window[] = [];
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
        // Do not attempt to show the widget, if it's already
        // visible.
        if (this.bIsActivated) {
            return;
        }

        this.ModifierMask = GExt.Platform.GetPrimaryModifier(Mask);

        // Reposition the widget to the active monitor.
        const monitor = GExt.Platform.GetActiveMonitor();
        this.Actor.set_position(monitor.x, monitor.y);
        this.Actor.set_size(monitor.width, monitor.height);

        // Initialize all window preview actors for all open
        // windows.
        this.CreateWindowPreviews(Windows);

        // Hide the window group and show our actor.
        global.window_group.hide();
        this.Actor.show();
        this.Actor.set_reactive(true);

        // Dim the background
        GExt.Platform.SetPanelReactivity(false);
        GExt.Platform.DimBackground(this.BackgroundGroup);

        // Push the actor as a modal if the latent execution ID
        // has expired.
        if (this.InitialDelayTimeoutId == 0) {
            Main.pushModal(this.Actor);
        }

        // Store the state of this switcher.
        this.bIsActivated = true;
        this.Windows = Windows;
        this.CurrentIndex = Index;
        this.InitialDelayTimeoutId = 0;

        // Switch to the next window and update previews.
        this.NextWindow();
    }

    Hide(): void {
        // Prevent this actor from capturing any input.
        this.Actor.set_reactive(false);

        // Pop this actor from the modal stack.
        Main.popModal(this.Actor);

        // Make panel reactive again.
        GExt.Platform.SetPanelReactivity(true);

        // If latent execution ID has expired, revert the
        // background dim.
        if (this.InitialDelayTimeoutId == 0) {
            GExt.Platform.RevertBackgroundDim(this.BackgroundGroup,
                                              this.FinishHiding.bind(this));
        }
    }

    FinishHiding(): void {
        // Hide our own background and actor.
        this.BackgroundGroup.hide();
        this.Actor.hide();

        // Destroy all existing window clones
        this.WindowPreviews.forEach((holder: T) => {
            holder.Actor.destroy();
        });
        this.WindowPreviews = [];

        // Show the window group again.
        global.window_group.show();
    }

    Destroy(): void { }

    HandleKeyPressed(_Actor: any, Event: any): boolean {
        // Take action depending on pressed key.
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

        // Take action depending on the determined keybinding.
        const keyCode = Event.get_key_code();
        const keyModifiers = Event.get_state();
        const action = global.display.get_keybinding_action(keyCode, keyModifiers);
        switch (action) {
            case Meta.KeyBindingAction.SWITCH_APPLICATIONS:
            case Meta.KeyBindingAction.SWITCH_GROUP:
            case Meta.KeyBindingAction.SWITCH_WINDOWS:
            case Meta.KeyBindingAction.SWITCH_PANELS:
                // If shift was pressed, go backwards.
                if (keyModifiers & Clutter.ModifierType.SHIFT_MASK) {
                    this.PreviousWindow();
                } else {
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

    SetShownWindowTitle(Window: any): void {
        this.SetShownWindowDecorations(Window);
    }

    abstract CreateWindowPreview(Window: Meta.Window, Index: number): T | null;
    abstract CreateWindowPreviews(Windows: Meta.Window[]): void;
    abstract SetShownWindowDecorations(Window: any): void;
    abstract UpdateWindowPreviews(Index: number): void;

    PreviewNextWindow(): void {
        this.CurrentIndex = (this.CurrentIndex + 1) % this.Windows.length;
        this.UpdateWindowPreviews(1);
    }

    PreviewPreviousWindow(): void {
        this.CurrentIndex = (this.Windows.length + this.CurrentIndex - 1) % this.Windows.length;
        this.UpdateWindowPreviews(-1);
    }
}