/**
 * Board switcher.
 */

import * as Switcher from 'switcher';

const St = imports.gi.St;

class FWindowPreviewBoard extends Switcher.FWindowPreview {}

export class FWindowSwitcherBoard
    extends Switcher.FWindowSwitcherCore<FWindowPreviewBoard> {

    constructor() { super(); }

    MainLabel!: St.Label;

    MaxPerRow: number = 1;
    PositionX: number = 0;
    InnerMarginX: number = 0;
    InnerMarginY: number = 0;
    PreviewWidth: number = 0;
    PreviewHeight: number = 250;

    UpdateGridProperties(): void {
        const Monitor = GExt.Platform.GetActiveMonitor();

        this.MaxPerRow = GExt.Config.BoardRowLength;
        this.InnerMarginX = GExt.Config.BoardGridMargin;
        this.InnerMarginY = GExt.Config.BoardGridMargin;
        this.PositionX = Monitor.width * (1.0 - 0.9) / 2;
        this.PreviewWidth = (Monitor.width * 0.9
                            - this.MaxPerRow * this.InnerMarginX) / this.MaxPerRow;
    }

    CreateContainers(): void {
        super.CreateContainers();
        // TODO: move out to class
        //const Monitor = GExt.Platform.GetActiveMonitor();

        this.MainLabel = new St.Label({
            visible: true,
            text: '{n} windows open',
            opacity: 255,
        });

        this.UpdateGridProperties();
        this.MainLabel.x = this.PositionX;
        this.MainLabel.y = 10;

        // Set CSS styles
        this.MainLabel.set_style(`
            font-size: 22px;
            font-weight: 400;
            padding: 14px;
        `);

        this.PreviewActor.add_actor(this.MainLabel);
    }

    Show(Windows: any, Mask: any, Index: number): void {
        super.Show(Windows, Mask, Index);

        this.PreviewActor.opacity = 0;
        this.PreviewActor.x = -200;
        this.PreviewActor.ease({
            opacity: 255,
            x: 0,

            duration: GExt.Config.AnimationTime * 0.8,
            delay: 0,
            mode: GExt.Config.TransitionType,
        });
    }

    CreateWindowPreview(Window: Meta.Window, Index: number): FWindowPreviewBoard | null {
        // TODO: move out to class scope
        //const Monitor = GExt.Platform.GetActiveMonitor();
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

        // Determine grid position
        const column = Index % this.MaxPerRow;
        const row = Math.floor(Index / this.MaxPerRow);

        // Determine preview scale
        //const previewWidth = Monitor.width * GExt.Config.WindowPreviewScale;
        //const previewHeight = Monitor.height * GExt.Config.WindowPreviewScale;
    
        const clone = new FWindowPreviewBoard({
            opacity: (!Window.minimized && Window.get_workspace() == CurrentWorkspace
                || Window.is_on_all_workspaces()) ? 255 : 0,
            source: compositor,
            reactive: true,

            x: this.PositionX + column * (this.InnerMarginX + this.PreviewWidth),
            y: this.PositionX + row * (this.PreviewHeight + this.InnerMarginY),
            width: this.PreviewWidth,
            height: this.PreviewWidth / width * height,
        });

        // Set the pivot
        clone.setPivotPointPlacement(Switcher.Placement.LEFT);

        return clone;
    }

    CreateWindowPreviews(Windows: Meta.Window[]): void {
        this.WindowPreviews = [];

        this.UpdateGridProperties();
        this.MainLabel.text = `${Windows.length} windows open`;

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

    SetShownWindowDecorations(_Window: any): void {
    }

    UpdateWindowPreviews(_Direction: number): void {
    }
}

