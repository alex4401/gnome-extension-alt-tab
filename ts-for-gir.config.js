module.exports = {
    outdir: "@types",
    buildType: "types",
    environments: ["gjs"],

    girDirectories: [
        "/usr/share/gir-1.0",
        "/usr/lib/mutter-6",
        "/usr/share/gnome-shell",
    ],
    modules: [
        'Gtk-3.0',
        'Gdk-3.0',
        'Pango-1.0',
        'GLib-2.0',
        'Graphene-1.0',
        'Clutter-6',
        'ClutterX11-6',
        'Meta-6',
        'Shell-0.1',
        'St-1.0',
    ],

    prettify: true,
};