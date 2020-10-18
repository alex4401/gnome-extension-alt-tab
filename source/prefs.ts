const Gtk = imports.gi.Gtk;
//const Gio = imports.gi.Gio;
//const GLib = imports.gi.GLib;

//const Gettext = imports.gettext.domain('StriderAT');
//const _ = Gettext.gettext;

export function init() {
    //settings = Utils.getSettings(Self);
    //Convenience.initTranslations('StriderAT');
}

export function buildPrefsWidget() {
    // Build the interface
    const builder = new Gtk.Builder();
    builder.add_from_file( Self.dir.get_path() + '/Settings.ui' );
    
    // Get main box
    const box = builder.get_object('prefs_widget') as Gtk.Notebook;

    const extVersion = builder.get_object('extension_version') as Gtk.Label;
    const extName = builder.get_object('extension_name') as Gtk.Label;
    extVersion.set_text(` v${Self.metadata.version}`);
    extName.set_text(Self.metadata.name);

    box.show_all();
    return box;
}
