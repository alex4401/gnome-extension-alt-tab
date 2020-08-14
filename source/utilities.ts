export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function AppendParams(base: any, extra: any) {
    for (let key in extra) {
        base[key] = extra[key];
    }
}

export class FWindowFilterUtils {
    static SortWindowsByUserTime(win1: any, win2: any): number {
        let t1 = win1.get_user_time();
        let t2 = win2.get_user_time();
        return (t2 > t1) ? 1 : -1;
    }

    static MatchSkipTaskbar(win: any): boolean {
        return !win.is_skip_taskbar();
    }

    static MatchWmClass(win: any): boolean {
        return win.get_wm_class() == this && !win.is_skip_taskbar();
    }

    static MatchWorkspace(win: any): boolean {
        return win.get_workspace() == this && !win.is_skip_taskbar();
    }

    static MatchOtherWorkspace(win: any): boolean {
        return win.get_workspace() != this && !win.is_skip_taskbar();
    }
}