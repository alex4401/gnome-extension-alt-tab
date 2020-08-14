const Config = imports.misc.config;

export const PACKAGE_NAME = Config.PACKAGE_NAME;
export const PACKAGE_VERSION = Config.PACKAGE_VERSION;

export enum KeybindHandler {
    SWITCH_APPS = 'switch-applications',
    SWITCH_WINDOWS = 'switch-windows',
    SWITCH_GROUP = 'switch-group',
    SWITCH_PANELS = 'switch-panels',
    SWITCH_APPS_BACKWARDS = 'switch-applications-backward',
    SWITCH_WINDOWS_BACKWARDS = 'switch-windows-backward',
    SWITCH_GROUP_BACKWARDS = 'switch-group-backward',
}

export const POSITION_TOP = 1;
export const POSITION_BOTTOM = 7;
export const SHELL_SCHEMA = "org.gnome.shell.extensions.alttab";
export const TRANSITION_TYPE = 'easeOutQuad';