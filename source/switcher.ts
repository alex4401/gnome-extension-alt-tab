import * as Base from 'base';
import * as Constant from 'const';
//import * as Utils from 'utilities';


const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Pango = imports.gi.Pango;
//const Graphene = imports.gi.Graphene;
/*const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;*/

const PREVIEW_SCALE = 0.5;
const ICON_SIZE_BIG = 128;
let TRANSITION_TYPE = 'easeOutCubic';


export abstract class FWindowSwitcherCore extends Base.FWindowSwitcherBase {
    Actor: any
    PreviewActor: any
    BackgroundGroup: any

    bIsActivated: boolean = false
    Windows: any
    CurrentIndex: number = 0

    constructor() {
        super();
        this.CreateContainers();
    }

    CreateContainers(): void {
        this.BackgroundGroup = GExt.Platform.CreateBackgroundActor();
        GExt.Platform.BlurActor(this.BackgroundGroup, 8, 1);

        this.Actor = new St.Widget({ visible: true, reactive: true, });
        this.Actor.hide();
        this.PreviewActor = new St.Widget({ visible: true, reactive: true });
        this.Actor.add_actor(this.PreviewActor);
        Main.uiGroup.add_actor(this.Actor);

        this.Actor.connect('key-press-event', Lang.bind(this, this.HandleKeyPressed));
    }

    Show(Windows: any, Mask: any, Index: number): void {
        if (this.bIsActivated) {
            return;
        }

        let monitor = GExt.Platform.GetActiveMonitor();
        this.Actor.set_position(monitor.x, monitor.y);
        this.Actor.set_size(monitor.width, monitor.height);
        this.CreateWindowPreviews(Windows, Mask, Index);

        global.window_group.hide();
        this.Actor.show();
        this.Actor.set_reactive(true);
        GExt.Platform.SetPanelReactivity(false);
        GExt.Platform.DimBackground(this.BackgroundGroup);
        Main.pushModal(this.Actor);

        this.bIsActivated = true;
        this.Windows = Windows;
        this.CurrentIndex = Index;
        this.NextWindow();
    }

    Hide(): void {
        print('ALT-TAB -------------------------------');
        print('HIDE');
        this.Actor.set_reactive(false);

        Main.popModal(this.Actor);
        GExt.Platform.SetPanelReactivity(true);
        GExt.Platform.RevertBackgroundDim(this.BackgroundGroup, Lang.bind(this, this.FinishHiding));
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

        return false;
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
                let previewWidth = Monitor.width * PREVIEW_SCALE;
                let previewHeight = Monitor.height * PREVIEW_SCALE;
                if (width > previewWidth || height > previewHeight)
                    scale = Math.min(previewWidth / width, previewHeight / height);

                let clone = new Clutter.Clone({
                    opacity: (!metaWin.minimized && metaWin.get_workspace() == CurrentWorkspace
                        || metaWin.is_on_all_workspaces()) ? 255 : 0,
                    source: texture.get_size ? texture : compositor,
                    reactive: true,
                    anchor_gravity: Clutter.Gravity.WEST,
                    rotation_angle_y: 12,
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

        let app_icon_size = ICON_SIZE_BIG;
        let label_offset = 0;

        // window title label
        if (this.WindowTitle) {
            Tweener.addTween(this.WindowTitle, {
                opacity: 0,
                time: 0.25,
                transition: TRANSITION_TYPE,
                onComplete: Lang.bind(this.Actor, this.Actor.remove_actor, this.WindowTitle),
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
        Tweener.addTween(this.WindowTitle, {
            opacity: 255,
            time: 0.25,
            transition: TRANSITION_TYPE,
        });

        let cx = Math.round((Monitor.width + label_offset) / 2);
        let cy = Math.round(Monitor.height * Constant.POSITION_BOTTOM / 8 - 0);

        this.WindowTitle.x = cx - Math.round(this.WindowTitle.get_width() / 2);
        this.WindowTitle.y = cy - Math.round(this.WindowTitle.get_height() / 2);

        // window icon
        if (this.WindowIconBox) {
            Tweener.addTween(this.WindowIconBox, {
                opacity: 0,
                time: 0.25,
                transition: TRANSITION_TYPE,
                onComplete: Lang.bind(this.Actor, this.Actor.remove_actor, this.WindowIconBox),
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
        Tweener.addTween(this.WindowIconBox, {
            opacity: 255,
            time: 0.25,
            transition: TRANSITION_TYPE,
        });
    }

    UpdateWindowPreviews(Direction: number): void {
        if (this.WindowPreviews.length == 0)
            return;

        //let Monitor = GExt.Platform.GetActiveMonitor();
        let animation_time = 0.25;

        if (this.WindowPreviews.length == 1) {
            let preview = this.WindowPreviews[0];
            Tweener.addTween(preview, {
                opacity: 255,
                x: preview.target_x,
                y: preview.target_y,
                width: preview.target_width,
                height: preview.target_height,
                time: animation_time / 2,
                transition: TRANSITION_TYPE
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
                Tweener.addTween(preview, {
                    opacity: 0,
                    x: preview.target_x + 200,
                    y: preview.target_y + 100,
                    width: preview.target_width,
                    height: preview.target_height,
                    time: animation_time / 2,
                    transition: TRANSITION_TYPE,
                    onCompleteParams: [preview, distance, animation_time],
                    onComplete: this.OnFadeForwardComplete,
                    onCompleteScope: this,
                });
            } else if (distance == 0 && Direction < 0) {
                preview.__looping = true;
                Tweener.addTween(preview, {
                    opacity: 0,
                    time: animation_time / 2,
                    transition: TRANSITION_TYPE,
                    onCompleteParams: [preview, distance, animation_time],
                    onComplete: this.OnFadeBackwardsComplete,
                    onCompleteScope: this,
                });
            } else {
                let tweenparams = {
                    opacity: 255,
                    x: preview.target_x - Math.sqrt(distance) * 150,
                    y: preview.target_y - Math.sqrt(distance) * 100,
                    width: Math.max(preview.target_width * ((20 - 2 * distance) / 20), 0),
                    height: Math.max(preview.target_height * ((20 - 2 * distance) / 20), 0),
                    time: animation_time,
                    transition: TRANSITION_TYPE,
                };

                if (preview.__looping || preview.__finalTween) {
                    preview.__finalTween = tweenparams;
                }
                else {
                    Tweener.addTween(preview, tweenparams);
                }
            }
        }
    }


    OnFadeBackwardsComplete(preview: any, distance: number, animation_time: number) {
        print(distance);
        preview.__looping = false;
        this.PreviewActor.set_child_above_sibling(preview, null);

        preview.x = preview.target_x + 200;
        preview.y = preview.target_y + 100;
        preview.width = preview.target_width;
        preview.height = preview.target_height;

        Tweener.addTween(preview, {
            opacity: 255,
            x: preview.target_x,
            y: preview.target_y,
            width: preview.target_width,
            height: preview.target_height,
            time: animation_time / 2,
            transition: TRANSITION_TYPE,
            onCompleteParams: [preview],
            onComplete: this.OnFinishMove,
            onCompleteScope: this,
        });
    }

    OnFadeForwardComplete(preview: any, distance: number, animation_time: number) {
        preview.__looping = false;
        this.PreviewActor.set_child_below_sibling(preview, null);

        preview.x = preview.target_x - Math.sqrt(distance) * 150;
        preview.y = preview.target_y - Math.sqrt(distance) * 100;
        preview.width = Math.max(preview.target_width * ((20 - 2 * distance) / 20), 0);
        preview.height = Math.max(preview.target_height * ((20 - 2 * distance) / 20), 0);

        Tweener.addTween(preview, {
            opacity: 255,
            time: animation_time / 2,
            transition: TRANSITION_TYPE,
            onCompleteParams: [preview],
            onComplete: this.OnFinishMove,
            onCompleteScope: this,
        });
    }

    OnFinishMove(preview: any) {
        if (preview.__finalTween) {
            Tweener.addTween(preview, preview.__finalTween);
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

