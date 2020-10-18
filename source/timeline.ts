/**
 * Timeline switcher.
 * 
 * Based off the Coverflow Alt-Tab extension, which can be found
 * in this repository: https://github.com/dmo60/CoverflowAltTab
 */

import * as Switcher from 'switcher';
import * as Constant from 'const';

const St = imports.gi.St;
const Pango = imports.gi.Pango;

function findUpperLeftFromCenter(sideSize: number, position: number): number {
    return position - sideSize / 2;
}

class FWindowPreviewTimeline extends Switcher.FWindowPreview {
    public Width: number = 0;
    public Height: number = 0;
    public WidthSide: number = 0;
    public HeightSide: number = 0;
    public X: number = 0;
    public Y: number = 0;
    public bIsLooping: boolean = false;
    public FinalTweenParams: any = null;
}

export class FWindowSwitcherTimeline
    extends Switcher.FWindowSwitcherCore<FWindowPreviewTimeline> {

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

    CreateWindowPreview(Window: Meta.Window, _Index: number): FWindowPreviewTimeline | null {
        // TODO: move out to class scope
        const Monitor = GExt.Platform.GetActiveMonitor();
        const CurrentWorkspace = global.workspace_manager.get_active_workspace();

        // Get window's compositor and make sure it's not a null.
        const compositor = Window.get_compositor_private() as Meta.WindowActor;
        if (!compositor) {
            return null;
        }

        // Get the size of compositor's texture
        const texture = compositor.get_texture();
        const [ok, width, height] = texture.get_preferred_size();
        if (!ok) {
            return null;
        }

        // Determine preview scale
        let scale = 1.0;
        const previewWidth = Monitor.width * GExt.Config.WindowPreviewScale;
        const previewHeight = Monitor.height * GExt.Config.WindowPreviewScale;
        if (width > previewWidth || height > previewHeight) {
            scale = Math.min(previewWidth / width, previewHeight / height);
        }
    
        const clone = new FWindowPreviewTimeline({
            opacity: (!Window.minimized && Window.get_workspace() == CurrentWorkspace
                || Window.is_on_all_workspaces()) ? 255 : 0,
            source: compositor,
            reactive: true,

            x: (Window.minimized ? -(compositor.x + compositor.width / 2)
                : compositor.x) - Monitor.x,
            y: (Window.minimized ? -(compositor.y + compositor.height / 2)
                : compositor.y) - Monitor.y,
            rotation_angle_y: GExt.Config.TimelineAngle,
        });

        // TODO: move to class scope
        const previewsCenterPosition = {
            x: Monitor.width / 2,
            y: Monitor.height / 2 + 0 // TODO: Settings->TimelineHeightOffset
        };

        // Set the pivot
        clone.setPivotPointPlacement(Switcher.Placement.LEFT);
        
        // Set translation info
        clone.Width = Math.round(width * scale);
        clone.Height = Math.round(height * scale);
        clone.WidthSide = clone.Width * 2/3;
        clone.HeightSide = clone.Height;
        clone.X = findUpperLeftFromCenter(clone.Width, previewsCenterPosition.x);
        clone.Y = findUpperLeftFromCenter(clone.Height, previewsCenterPosition.y);

        return clone;
    }

    CreateWindowPreviews(Windows: Meta.Window[]): void {
        this.WindowPreviews = [];

        let index = 0;
        Windows.forEach((window: Meta.Window) => {
            const preview = this.CreateWindowPreview(window, index);
            if (!preview) {
                // Preview isn't valid, continue with the loop.
                return;
            }

            // Push the preview onto the list
            this.WindowPreviews.push(preview);
            this.PreviewActor.add_actor(preview.Actor);
            preview.makeBottomLayer(this.PreviewActor);

            index++;
        });
    }

    SetShownWindowDecorations(Window: any): void {
        // TODO: move out to class
        const Monitor = GExt.Platform.GetActiveMonitor();

        const labelOffset = 0;

        // Phase out old window title actor
        if (this.WindowTitle) {
            const oldWindowLabel = this.WindowTitle
            oldWindowLabel.ease({
                opacity: 0,
                duration: GExt.Config.AnimationTime,
                delay: 0,
                mode: GExt.Config.TransitionType,
                onComplete: () => {
                    this.Actor.remove_actor(oldWindowLabel);
                },
            });
        }

        // Phase out old icon box actor
        if (this.WindowIconBox) {
            const oldIconBox = this.WindowIconBox;
            oldIconBox.ease({
                opacity: 0,
                duration: GExt.Config.AnimationTime,
                delay: 0,
                mode: GExt.Config.TransitionType,
                onComplete: () => {
                    this.Actor.remove_actor(oldIconBox);
                },
            });
        }

        // Get application information from window
        const app = GExt.Platform.GetWindowTracker().get_window_app(Window);

        // Create a new window label overlay
        this.WindowTitle = this.ConstructWindowLabelOverlay(Window);
        this.Actor.add_actor(this.WindowTitle);

        const cx = Math.round((Monitor.width + labelOffset) / 2);
        const cy = Math.round(Monitor.height * Constant.POSITION_BOTTOM / 8 - 0); // settings->TitleOffset

        this.WindowTitle.x = cx - Math.round(this.WindowTitle.get_width() / 2);
        this.WindowTitle.y = cy - Math.round(this.WindowTitle.get_height() / 2);

        // Construct a new icon box
        this.WindowIconBox = this.ConstructWindowIconOverlay(app);
        this.Actor.add_actor(this.WindowIconBox);

        // Phase in the new window label overlay
        this.WindowTitle.ease({
            opacity: 255,
            duration: GExt.Config.AnimationTime,
            delay: 0,
            mode: GExt.Config.TransitionType,
        });

        // Phase in the new icon box
        this.WindowIconBox.ease({
            opacity: 255,
            duration: GExt.Config.AnimationTime,
            delay: 0,
            mode: GExt.Config.TransitionType,
        });
    }

    ConstructWindowLabelOverlay(Window: Meta.Window): St.Label {
        // TODO: move out to class
        const Monitor = GExt.Platform.GetActiveMonitor();

        const windowLabel = new St.Label({
            style_class: 'switcher-list',
            text: Window.get_title(),
            opacity: 0
        });

        // Set CSS styles
        windowLabel.set_style(`
            max-width: ${Monitor.width - 200}px;
            font-size: 14px;
            font-weight: bold;
            padding: 14px;
        `);

        // Make the text get ellipsized if too long
        windowLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;

        return windowLabel;
    }

    // TODO: typing
    ConstructWindowIconOverlay(Application: any): St.Bin {
        // TODO: move out to class
        const Monitor = GExt.Platform.GetActiveMonitor();

        const iconSize = GExt.Config.WindowIconSize;
        // Get application's own icon or display a generic image
        let iconTexture = Application ? Application.create_icon_texture(iconSize) : null;
        if (!iconTexture) {
            iconTexture = new St.Icon({
                icon_name: 'applications-other',
                icon_size: iconSize
            });
        }

        const iconBox = new St.Bin({
            style_class: 'window-iconbox',
            width: iconSize * 1.15,
            height: iconSize * 1.15,
            opacity: 0,
            x: (Monitor.width - iconSize) / 2,
            y: (Monitor.height - iconSize) / 2,
        });

        iconBox.add_actor(iconTexture);
        return iconBox;
    }

    UpdateWindowPreviews(Direction: number): void {
        if (this.WindowPreviews.length == 0)
            return;

        if (this.WindowPreviews.length == 1) {
            const info = this.WindowPreviews[0];
            info.Actor.ease({
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
                info.Actor.ease({
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
            } else if (distance === 0 && Direction < 0) {
                info.bIsLooping = true;
                info.Actor.ease({
                    opacity: 0,

                    duration: GExt.Config.AnimationTime / 2,
                    delay: 0,
                    mode: GExt.Config.TransitionType,

                    onComplete: this.OnFadeBackwardsComplete.bind(this, info, distance),
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
                    info.Actor.ease(tweenParams);
                }
            }
        }
    }

    OnFadeBackwardsComplete(preview: FWindowPreviewTimeline, _distance: number) {
        preview.bIsLooping = false;
        this.PreviewActor.set_child_above_sibling(preview.Actor, null);

        preview.Actor.x = preview.X + 200;
        preview.Actor.y = preview.Y + 100;
        preview.Actor.width = preview.Width;
        preview.Actor.height = preview.Height;

        preview.Actor.ease({
            opacity: 255,
            x: preview.X,
            y: preview.Y,
            width: preview.Width,
            height: preview.Height,

            duration: GExt.Config.AnimationTime / 2,
            delay: 0,
            mode: GExt.Config.TransitionType,

            onComplete: this.OnFinishMove.bind(this, preview),
        });
    }

    OnFadeForwardComplete(preview: FWindowPreviewTimeline, distance: number) {
        preview.bIsLooping = false;
        this.PreviewActor.set_child_below_sibling(preview.Actor, null);

        preview.Actor.x = preview.X - Math.sqrt(distance) * 150;
        preview.Actor.y = preview.Y - Math.sqrt(distance) * 100;
        preview.Actor.width = Math.max(preview.Width * ((20 - 2 * distance) / 20), 0);
        preview.Actor.height = Math.max(preview.Height * ((20 - 2 * distance) / 20), 0);

        preview.Actor.ease({
            opacity: 255,

            duration: GExt.Config.AnimationTime / 2,
            delay: 0,
            mode: GExt.Config.TransitionType,

            onComplete: this.OnFinishMove.bind(this, preview)
        });
    }

    OnFinishMove(preview: FWindowPreviewTimeline) {
        if (preview.FinalTweenParams) {
            preview.Actor.ease(preview.FinalTweenParams);
            preview.FinalTweenParams = null;
        }
    }

}

