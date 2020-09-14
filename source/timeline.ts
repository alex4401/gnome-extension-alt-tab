/**
 * Timeline switcher.
 * 
 * Based off the Coverflow Alt-Tab extension, which can be found
 * in this repository: https://github.com/dmo60/CoverflowAltTab
 */

import * as Switcher from 'switcher';
import * as Constant from 'const';

const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Pango = imports.gi.Pango;

interface IWindowPreviewInfo extends Switcher.IWindowPreviewHolder {
    Width: number;
    Height: number;
    WidthSide: number;
    HeightSide: number;
    X: number;
    Y: number;
    bIsLooping: boolean;
    FinalTweenParams: any;
}

export class FWindowSwitcherTimeline
    extends Switcher.FWindowSwitcherCore<IWindowPreviewInfo> {

    constructor() { super(); }

    WindowTitle: any;
    WindowIconBox: any;
    IconTexture: any;
    bIsLooping: boolean = false;
    bRequiresUpdate: boolean = false;

    YOffset: number = 0;
    XLeftOffset: number = 0;
    XRightOffset: number = 0;
    XCenterOffset: number = 0;

    SetOffsetValues(): void {
        const Monitor = GExt.Platform.GetActiveMonitor();
        this.YOffset = Monitor.height / 2;
        this.XLeftOffset = Monitor.width * 0.1;
        this.XRightOffset = Monitor.width - this.XLeftOffset;
        this.XCenterOffset = Monitor.width / 2;
    }

    CreateWindowPreviews(Windows: Meta.Window[], _Mask: any, _Index: number): void {
        const Monitor = GExt.Platform.GetActiveMonitor();
        const CurrentWorkspace = global.workspace_manager.get_active_workspace();
        this.WindowPreviews = [];

        Windows.forEach((window: Meta.Window) => {
            const compositor = window.get_compositor_private() as Meta.WindowActor;
            if (!compositor) {
                return;
            }

            const texture = compositor.get_texture();
            const [ok, width, height] = texture.get_preferred_size();
            if (!ok) {
                return;
            }

            let scale = 1.0;
            const previewWidth = Monitor.width * GExt.Config.WindowPreviewScale;
            const previewHeight = Monitor.height * GExt.Config.WindowPreviewScale;
            if (width > previewWidth || height > previewHeight) {
                scale = Math.min(previewWidth / width, previewHeight / height);
            }

            const clone = new Clutter.Clone({
                opacity: (!window.minimized && window.get_workspace() == CurrentWorkspace
                    || window.is_on_all_workspaces()) ? 255 : 0,
                source: compositor,
                reactive: true,
                anchor_gravity: Clutter.Gravity.WEST,
                rotation_angle_y: GExt.Config.TimelineAngle,

                x: ((window.minimized) ? 0 : compositor.x + compositor.width / 2) - Monitor.x,
                y: ((window.minimized) ? 0 : compositor.y + compositor.height / 2) - Monitor.y,
            });

            const targetWidth = Math.round(width * scale);
            const targetHeight = Math.round(height * scale);
            const result = {
                CloneActor: clone,

                Width: targetWidth,
                Height: targetHeight,
                WidthSide: targetWidth * 2 / 3,
                HeightSide: targetHeight * 2 / 3,
                X: Math.round(Monitor.width * 0.3),
                Y: Math.round(Monitor.height * 0.5),

                bIsLooping: false,
                FinalTweenParams: null,
            };

            this.WindowPreviews.push(result);
            this.PreviewActor.add_actor(clone);
            this.PreviewActor.set_child_below_sibling(clone, null);
        });
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
            const info = this.WindowPreviews[0];
            info.CloneActor.ease({
                opacity: 255,
                x: info.X,
                y: info.Y,
                width: info.Width,
                height: info.Height,

                duration: GExt.Config.AnimationTime / 2,
                delay: 0,
                mode: GExt.Config.TransitionType
            });
            return;
        }

        // preview windows
        for (let index = 0; index < this.WindowPreviews.length; index++) {
            const info = this.WindowPreviews[index];
            const distance = (this.CurrentIndex > index)
                ? this.WindowPreviews.length - this.CurrentIndex + index
                : index - this.CurrentIndex;

            if (distance == this.WindowPreviews.length - 1 && Direction > 0) {
                info.bIsLooping = true;
                info.CloneActor.ease({
                    opacity: 0,
                    x: info.X + 200,
                    y: info.Y + 100,
                    width: info.Width,
                    height: info.Height,

                    duration: GExt.Config.AnimationTime / 2,
                    delay: 0,
                    mode: GExt.Config.TransitionType,

                    onComplete: this.OnFadeForwardComplete.bind(this, info, distance),
                });
            } else if (distance == 0 && Direction < 0) {
                info.bIsLooping = true;
                info.CloneActor.ease({
                    opacity: 0,

                    duration: GExt.Config.AnimationTime / 2,
                    delay: 0,
                    mode: GExt.Config.TransitionType,

                    onComplete: this.OnFadeForwardComplete.bind(this, info, distance),
                });
            } else {
                const tweenParams = {
                    opacity: 255,
                    x: info.X - Math.sqrt(distance) * 150,
                    y: info.Y - Math.sqrt(distance) * 100,
                    width: Math.max(info.Width * ((20 - 2 * distance) / 20), 0),
                    height: Math.max(info.Height * ((20 - 2 * distance) / 20), 0),

                    duration: GExt.Config.AnimationTime,
                    mode: GExt.Config.TransitionType,
                };

                if (info.bIsLooping || info.FinalTweenParams) {
                    info.FinalTweenParams = tweenParams;
                }
                else {
                    info.CloneActor.ease(tweenParams);
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

