declare namespace Clutter {
    enum ActorAlign {
        FILL = 0,
        START = 1,
        CENTER = 3,
        END = 3
    }

    interface Actor extends Rectangular, GObject.Object {
        visible: boolean;
        x_align: ActorAlign;
        y_align: ActorAlign;

        add(child: Actor): void;
        destroy(): void;
        ease(params: Object): void;
        hide(): void;
        get_child_at_index(nth: number): Clutter.Actor | null;
        get_n_children(): number;
        get_parent(): Clutter.Actor | null;
        get_transition(param: string): any | null;
        is_visible(): boolean;
        queue_redraw(): void;
        remove_all_children(): void;
        remove_all_transitions(): void;
        remove_child(child: Actor): void;
        set_child_below_sibling(child: Actor, sibling: Actor | null): void;
        set_easing_duration(msecs: number | null): void;
        set_opacity(value: number): void;
        set_y_align(align: ActorAlign): void;
        show(): void;
    }

    interface Text extends Actor {
        get_text(): Readonly<string>;
        set_text(text: string | null): void;
    }
}