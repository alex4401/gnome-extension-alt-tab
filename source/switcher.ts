import * as Base from 'base';
import * as Constant from 'const';
//import * as Utils from 'utilities';


const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Pango = imports.gi.Pango;
const GLib = imports.gi.GLib;


export abstract class FWindowSwitcherCore extends Base.FWindowSwitcherBase {
    Actor: any
    PreviewActor: any
    BackgroundGroup: any

    bIsActivated: boolean = false
    Windows: any
    CurrentIndex: number = 0
    ModifierMask: any
    InitialDelayTimeoutId: number = 0

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
        print('ALT-TAB -------------------------------');
        print('HIDE');
        this.Actor.set_reactive(false);

        Main.popModal(this.Actor);
        GExt.Platform.SetPanelReactivity(true);

        if (this.InitialDelayTimeoutId == 0) {
            GExt.Platform.RevertBackgroundDim(this.BackgroundGroup, Lang.bind(this, this.FinishHiding));
        }
    }

    FinishHiding(): void {
        print('ALT-TAB -------------------------------');
        print('FINISH');

        this.BackgroundGroup.hide();
        this.Actor.hide();

        // show all window actors
        global.window_group.show();
    }

    Destroy(): void {

    }

    HandleKeyPressed(_Actor: any, Event: any): boolean {
        print('ALT-TAB -------------------------------');
        print(Event.get_key_symbol());
        switch (Event.get_key_symbol()) {
            case Clutter.KEY_Escape:
            case Clutter.Escape:
                this.Hide();
                return true;

            case Clutter.KEY_Right:
            case Clutter.KEY_Down:
            case Clutter.Right:
            case Clutter.Down:
                // Right/Down -> navigate to next preview
                this.NextWindow();
                return true;

            case Clutter.KEY_Left:
            case Clutter.KEY_Up:
            case Clutter.Left:
            case Clutter.Up:
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

export class FWindowSwitcherTimeline extends FWindowSwitcherCore {
    constructor() { super(); }

    WindowPreviews: Array<any> = []
    WindowTitle: any
    WindowIconBox: any
    IconTexture: any
    bIsLooping: boolean = false
    bRequiresUpdate: boolean = false

    YOffset: number = 0
    XLeftOffset: number = 0
    XRightOffset: number = 0
    XCenterOffset: number = 0

    SetOffsetValues(): void {
        const Monitor = GExt.Platform.GetActiveMonitor();
        this.YOffset = Monitor.height / 2;
        this.XLeftOffset = Monitor.width * 0.1;
        this.XRightOffset = Monitor.width - this.XLeftOffset;
        this.XCenterOffset = Monitor.width / 2;
    }

    CreateWindowPreviews(Windows: any, Mask: any, Index: number): void {
        print(Mask);
        print(Index);

        let Monitor = GExt.Platform.GetActiveMonitor();
        let CurrentWorkspace = global.workspace_manager.get_active_workspace();

        this.WindowPreviews = [];
        for (let i in Windows) {
            let metaWin = Windows[i];
            let compositor = Windows[i].get_compositor_private();
            if (compositor) {
                let texture = compositor.get_texture();
                let [ok, width, height] = texture.get_preferred_size();
                if (!ok) {
                    print('Huh');
                }

                let scale = 1.0;
                let previewWidth = Monitor.width * GExt.Config.WindowPreviewScale;
                let previewHeight = Monitor.height * GExt.Config.WindowPreviewScale;
                if (width > previewWidth || height > previewHeight)
                    scale = Math.min(previewWidth / width, previewHeight / height);

                let clone = new Clutter.Clone({
                    opacity: (!metaWin.minimized && metaWin.get_workspace() == CurrentWorkspace
                        || metaWin.is_on_all_workspaces()) ? 255 : 0,
                    source: texture.get_size ? texture : compositor,
                    reactive: true,
                    anchor_gravity: Clutter.Gravity.WEST,
                    rotation_angle_y: GExt.Config.TimelineAngle,
                    x: ((metaWin.minimized) ? 0 : compositor.x + compositor.width / 2) - Monitor.x,
                    y: ((metaWin.minimized) ? 0 : compositor.y + compositor.height / 2) - Monitor.y
                });

                clone.target_width = Math.round(width * scale);
                clone.target_height = Math.round(height * scale);
                clone.target_width_side = clone.target_width * 2 / 3;
                clone.target_height_side = clone.target_height;

                clone.target_x = Math.round(Monitor.width * 0.3);
                clone.target_y = Math.round(Monitor.height * 0.5) - 0;

                this.WindowPreviews.push(clone);
                this.PreviewActor.add_actor(clone);
                this.PreviewActor.set_child_below_sibling(clone, null);
            }
        }
    }

    SetShownWindowTitle(Window: any): void {
        const Monitor = GExt.Platform.GetActiveMonitor();

        let app_icon_size = GExt.Config.WindowIconSize;
        let label_offset = 0;

        // window title label
        if (this.WindowTitle) {
            this.WindowTitle.ease({
                opacity: 0,
                duration: GExt.Config.AnimationTime,
                delay: 0,
                mode: GExt.Config.TransitionType,
                onComplete: this.Actor.remove_actor.bind(this.Actor, this.WindowTitle)
            });
        }

        this.WindowTitle = new St.Label({
            style_class: 'switcher-list',
            text: Window.get_title(),
            opacity: 0
        });

        // ellipsize if title is too long
        this.WindowTitle.set_style("max-width:" + (Monitor.width - 200) + "px;font-size: 14px;font-weight: bold; padding: 14px;");
        this.WindowTitle.clutter_text.ellipsize = Pango.EllipsizeMode.END;

        this.Actor.add_actor(this.WindowTitle);
        this.WindowTitle.ease({
            opacity: 255,
            duration: GExt.Config.AnimationTime,
            delay: 0,
            mode: GExt.Config.TransitionType
        });

        let cx = Math.round((Monitor.width + label_offset) / 2);
        let cy = Math.round(Monitor.height * Constant.POSITION_BOTTOM / 8 - 0);

        this.WindowTitle.x = cx - Math.round(this.WindowTitle.get_width() / 2);
        this.WindowTitle.y = cy - Math.round(this.WindowTitle.get_height() / 2);

        // window icon
        if (this.WindowIconBox) {
            this.WindowTitle.ease({
                opacity: 0,
                duration: GExt.Config.AnimationTime,
                delay: 0,
                mode: GExt.Config.TransitionType,
                onComplete: this.Actor.remove_actor.bind(this.Actor, this.WindowIconBox)
            });
        }

        let app = GExt.Platform.GetWindowTracker().get_window_app(Window);
        this.IconTexture = app ? app.create_icon_texture(app_icon_size) : null;

        if (!this.IconTexture) {
            this.IconTexture = new St.Icon({
                icon_name: 'applications-other',
                icon_size: app_icon_size
            });
        }

        this.WindowIconBox = new St.Bin({
            style_class: 'window-iconbox',
            width: app_icon_size * 1.15,
            height: app_icon_size * 1.15,
            opacity: 0,
            x: (Monitor.width - app_icon_size) / 2,
            y: (Monitor.height - app_icon_size) / 2,
        });

        this.WindowIconBox.add_actor(this.IconTexture);
        this.Actor.add_actor(this.WindowIconBox);
        this.WindowTitle.ease({
            opacity: 255,
            duration: GExt.Config.AnimationTime,
            delay: 0,
            mode: GExt.Config.TransitionType
        });
    }

    UpdateWindowPreviews(Direction: number): void {
        if (this.WindowPreviews.length == 0)
            return;

        if (this.WindowPreviews.length == 1) {
            let preview = this.WindowPreviews[0];
            preview.ease({
                opacity: 255,
                x: preview.target_x,
                y: preview.target_y,
                width: preview.target_width,
                height: preview.target_height,
                duration: GExt.Config.AnimationTime / 2,
                delay: 0,
                mode: GExt.Config.TransitionType
            });
            return;
        }

        // preview windows
        for (let i = 0; i < this.WindowPreviews.length; i++) {
            let preview = this.WindowPreviews[i];
            let distance = (this.CurrentIndex > i)
                ? this.WindowPreviews.length - this.CurrentIndex + i
                : i - this.CurrentIndex;

            if (distance == this.WindowPreviews.length - 1 && Direction > 0) {
                preview.__looping = true;
                preview.ease({
                    opacity: 0,
                    x: preview.target_x + 200,
                    y: preview.target_y + 100,
                    width: preview.target_width,
                    height: preview.target_height,

                    duration: GExt.Config.AnimationTime / 2,
                    delay: 0,
                    mode: GExt.Config.TransitionType,

                    onComplete: this.OnFadeForwardComplete.bind(this, preview, distance),
                });
            } else if (distance == 0 && Direction < 0) {
                preview.__looping = true;
                preview.ease({
                    opacity: 0,

                    duration: GExt.Config.AnimationTime / 2,
                    delay: 0,
                    mode: GExt.Config.TransitionType,

                    onComplete: this.OnFadeForwardComplete.bind(this, preview, distance),
                });
            } else {
                let tweenparams = {
                    opacity: 255,
                    x: preview.target_x - Math.sqrt(distance) * 150,
                    y: preview.target_y - Math.sqrt(distance) * 100,
                    width: Math.max(preview.target_width * ((20 - 2 * distance) / 20), 0),
                    height: Math.max(preview.target_height * ((20 - 2 * distance) / 20), 0),

                    duration: GExt.Config.AnimationTime,
                    mode: GExt.Config.TransitionType,
                };

                if (preview.__looping || preview.__finalTween) {
                    preview.__finalTween = tweenparams;
                }
                else {
                    preview.ease(tweenparams);
                }
            }
        }
    }

    OnFadeBackwardsComplete(preview: any, distance: number) {
        print(distance);
        preview.__looping = false;
        this.PreviewActor.set_child_above_sibling(preview, null);

        preview.x = preview.target_x + 200;
        preview.y = preview.target_y + 100;
        preview.width = preview.target_width;
        preview.height = preview.target_height;

        preview.ease({
            opacity: 255,
            x: preview.target_x,
            y: preview.target_y,
            width: preview.target_width,
            height: preview.target_height,

            duration: GExt.Config.AnimationTime / 2,
            delay: 0,
            mode: GExt.Config.TransitionType,

            onComplete: this.OnFinishMove.bind(this, preview)
        });
    }

    OnFadeForwardComplete(preview: any, distance: number) {
        preview.__looping = false;
        this.PreviewActor.set_child_below_sibling(preview, null);

        preview.x = preview.target_x - Math.sqrt(distance) * 150;
        preview.y = preview.target_y - Math.sqrt(distance) * 100;
        preview.width = Math.max(preview.target_width * ((20 - 2 * distance) / 20), 0);
        preview.height = Math.max(preview.target_height * ((20 - 2 * distance) / 20), 0);

        preview.ease({
            opacity: 255,

            duration: GExt.Config.AnimationTime / 2,
            delay: 0,
            mode: GExt.Config.TransitionType,

            onComplete: this.OnFinishMove.bind(this, preview)
        });
    }

    OnFinishMove(preview: any) {
        if (preview.__finalTween) {
            preview.ease(preview.__finalTween);
            preview.__finalTween = null;
        }
    }

    PreviewNextWindow() {
        this.CurrentIndex = (this.CurrentIndex + 1) % this.Windows.length;
        this.UpdateWindowPreviews(1);
    }

    PreviewPreviousWindow() {
        this.CurrentIndex = (this.Windows.length + this.CurrentIndex - 1) % this.Windows.length;
        this.UpdateWindowPreviews(-1);
    }
}

