declare namespace St {
    interface Widget extends Clutter.Actor {
        hide(): void;
        set_style_class_name(name: string): void;
        add_style_class_name(name: string): void
        remove_style_class_name(name: string): void;

        set_style_pseudo_class(name: string): void;
        add_style_pseudo_class(name: string): void;
        remove_style_pseudo_class(name: string): void

        show(): void;
        show_all(): void;
    }

    interface Entry extends Widget {
        clutter_text: any;

        get_clutter_text(): Clutter.Text;
        grab_key_focus(): void;
    }
}