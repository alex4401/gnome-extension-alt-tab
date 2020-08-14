/*
export class FWindowSwitcherCF extends FWindowSwitcherCore {
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
        print('CreatePreviews');
        print(Windows);
        print(Mask);
        print(Index);

        let Monitor = GExt.Platform.GetActiveMonitor();
        let CurrentWorkspace = global.workspace_manager.get_active_workspace();

        this.SetOffsetValues();

        this.WindowPreviews = [];
        for (let i in Windows) {
            let metaWin = Windows[i];
            let compositor = Windows[i].get_compositor_private();

            if (compositor) {
                let texture = compositor.get_texture();
                let [ok, width, height] = texture.get_preferred_size();
                if (!ok) {
                    print('Huh.');
                }

                let scale = 1.0;
                let PreviewWidth = Monitor.width * PREVIEW_SCALE;
                let PreviewHeight = Monitor.height * PREVIEW_SCALE;

                if (width > PreviewWidth || height > PreviewHeight) {
                    scale = Math.min(PreviewWidth / width, PreviewHeight / height);
                }

                let clone = new Clutter.Clone({
                    opacity: (!metaWin.minimized && metaWin.get_workspace() == CurrentWorkspace
                        || metaWin.is_on_all_workspaces()) ? 255 : 0,
                    source: texture.get_size ? texture : compositor,
                    reactive: true,
                    anchor_gravity: Clutter.Gravity.CENTER,
                    x: ((metaWin.minimized) ? 0 : compositor.x + compositor.width / 2) - Monitor.x,
                    y: ((metaWin.minimized) ? 0 : compositor.y + compositor.height / 2) - Monitor.y
                });

                clone.target_width = Math.round(width * scale);
                clone.target_height = Math.round(height * scale);
                clone.target_width_side = clone.target_width * 2 / 3;
                clone.target_height_side = clone.target_height;

                this.WindowPreviews.push(clone);
                this.PreviewActor.add_actor(clone);
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

    UpdateWindowPreviews(Index: number): void {
        if (this.bIsLooping) {
            this.bRequiresUpdate = true;
            return;
        }

        // preview windows
        print(Index);
        for (let i = 0; i < this.WindowPreviews.length; i++) {
            let preview = this.WindowPreviews[i];

            if (i == this.CurrentIndex) {
                this.AnimatePreviewToMiddle(preview, preview.get_anchor_point_gravity(), 0.25, null);
            } else if (i < this.CurrentIndex) {
                this.PreviewActor.set_child_above_sibling(preview, null);
                this.AnimatePreviewToSide(preview, i, Clutter.Gravity.WEST, this.XLeftOffset, {
                    opacity: 255,
                    rotation_angle_y: SIDE_ANGLE,
                    time: 0.25,
                    transition: TRANSITION_TYPE
                });
            } else if (i > this.CurrentIndex) {
                this.PreviewActor.set_child_below_sibling(preview, null);
                this.AnimatePreviewToSide(preview, i, Clutter.Gravity.EAST, this.XRightOffset, {
                    opacity: 255,
                    rotation_angle_y: -SIDE_ANGLE,
                    time: 0.25,
                    transition: TRANSITION_TYPE
                });
            }
        }
    }

    FlipWindowStack(Gravity: any): void {
        this.bIsLooping = true;

        let xOffset, angle;
        const Monitor = GExt.Platform.GetActiveMonitor();

        if (Gravity == Clutter.Gravity.WEST) {
            xOffset = -this.XLeftOffset;
            angle = BLEND_OUT_ANGLE;
        } else {
            xOffset = Monitor.width + this.XLeftOffset;
            angle = -BLEND_OUT_ANGLE;
        }

        let animation_time = 0.25 * 2 / 3;

        for (let i = 0; i < this.WindowPreviews.length; i++) {
            let preview = this.WindowPreviews[i];
            preview._cfIsLast = (i == this.Windows.length - 1);
            this.AnimatePreviewToSide(preview, i, Gravity, xOffset, {
                opacity: 0,
                rotation_angle_y: angle,
                time: animation_time,
                transition: TRANSITION_TYPE,
                onCompleteParams: [preview, i, Gravity],
                onComplete: this.HandleFlipIn,
                onCompleteScope: this,
            });
        }
    }

    HandleFlipIn(preview: any, index: number, gravity: any): void {
        let xOffsetStart, xOffsetEnd, angleStart, angleEnd;
        const Monitor = GExt.Platform.GetActiveMonitor();

        if (gravity == Clutter.Gravity.WEST) {
            xOffsetStart = Monitor.width + this.XLeftOffset;
            xOffsetEnd = this.XRightOffset;
            angleStart = -BLEND_OUT_ANGLE;
            angleEnd = -SIDE_ANGLE;
        } else {
            xOffsetStart = -this.XLeftOffset;
            xOffsetEnd = this.XLeftOffset;
            angleStart = BLEND_OUT_ANGLE;
            angleEnd = SIDE_ANGLE;
        }

        let animation_time = 0.25 * 2 / 3;

        preview.rotation_angle_y = angleStart;
        preview.x = xOffsetStart + 50 * (index - this.CurrentIndex);
        let lastExtraParams = {
            onCompleteParams: [],
            onComplete: this.HandleFlipCompleted,
            onCompleteScope: this
        };
        let oppositeGravity = (gravity == Clutter.Gravity.WEST) ? Clutter.Gravity.EAST : Clutter.Gravity.WEST;

        if (index == this.CurrentIndex) {
            if (preview.raise_top) {
                preview.raise_top();
            } else {
                this.PreviewActor.set_child_above_sibling(preview, null);
            }
            let extraParams = preview._cfIsLast ? lastExtraParams : null;
            this.AnimatePreviewToMiddle(preview, oppositeGravity, animation_time, extraParams);
        } else {
            if (gravity == Clutter.Gravity.EAST)
                preview.raise_top();
            else
                if (preview.lower_bottom) {
                    preview.lower_bottom();
                } else {
                    this.PreviewActor.set_child_below_sibling(preview, null);
                }

            let extraParams = {
                opacity: 255,
                rotation_angle_y: angleEnd,
                time: animation_time,
                transition: TRANSITION_TYPE
            };

            if (preview._cfIsLast)
                Utils.AppendParams(extraParams, lastExtraParams);
            this.AnimatePreviewToSide(preview, index, oppositeGravity, xOffsetEnd, extraParams);
        }
    }

    HandleFlipCompleted() {
        this.bIsLooping = false;
        if (this.bRequiresUpdate == true) {
            this.bRequiresUpdate = false;
            this.UpdateWindowPreviews(this.CurrentIndex);
        }
    }

    AnimatePreviewToSide(preview: any, index: number, gravity: any, xOffset: number, extraParams: any): void {
        preview.move_anchor_point_from_gravity(gravity);
        preview.rotation_center_y = new Graphene.Point3D({ x: 0.0, y: 0.0, z: 0.0 }); // deprecated!

        let tweenParams = {
            x: xOffset + 50 * (index - this.CurrentIndex),
            y: this.YOffset,
            width: Math.max(preview.target_width_side * (10 - Math.abs(index - this.CurrentIndex)) / 10, 0),
            height: Math.max(preview.target_height_side * (10 - Math.abs(index - this.CurrentIndex)) / 10, 0),
        };

        Utils.AppendParams(tweenParams, extraParams);
        Tweener.addTween(preview, tweenParams);
    }

    AnimatePreviewToMiddle(preview: any, oldGravity: any, animation_time: number, extraParams: any) {
        let rotation_vertex_x = (oldGravity == Clutter.Gravity.EAST) ? preview.width / 2 : -preview.width / 2;
        preview.move_anchor_point_from_gravity(Clutter.Gravity.CENTER);
        preview.rotation_center_y = new Graphene.Point3D({ x: rotation_vertex_x, y: 0.0, z: 0.0 });
        this.PreviewActor.set_child_above_sibling(preview, null);

        let tweenParams = {
            opacity: 255,
            x: this.XCenterOffset,
            y: this.YOffset,
            width: preview.target_width,
            height: preview.target_height,
            rotation_angle_y: 0.0,
            time: animation_time,
            transition: TRANSITION_TYPE
        };

        if (extraParams) {
            Utils.AppendParams(tweenParams, extraParams);
        }

        Tweener.addTween(preview, tweenParams);
    }

    PreviewNextWindow() {
        if (this.CurrentIndex == this.Windows.length - 1) {
            this.CurrentIndex = 0;
            this.FlipWindowStack(Clutter.Gravity.WEST);
        } else {
            this.CurrentIndex = this.CurrentIndex + 1;
            this.UpdateWindowPreviews(1);
        }
    }

    PreviewPreviousWindow() {
        if (this.CurrentIndex == 0) {
            this.CurrentIndex = this.Windows.length - 1;
            this.FlipWindowStack(Clutter.Gravity.EAST);
        } else {
            this.CurrentIndex = this.CurrentIndex - 1;
            this.UpdateWindowPreviews(-1);
        }
    }
}

*/