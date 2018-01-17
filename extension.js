const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;

let _workspaceAddedSignal;

let _signals = [];

let verbose = false;

function debugLog() {
    if (verbose) {
        let args = [].slice.call(arguments);
        args.unshift("[better-window-placement] DEBUG");
        global.log.apply(global, args);
    }
}

function _onWindowAdded(workspace, win) {
    let actor = win.get_compositor_private();
    if (!actor) {
        Mainloop.idle_add(Lang.bind(this, function () {
            this._onWindowAdded(workspace, win);
        }));
    } else {
        this._placeWindow(win, workspace);
    }
}

function _isWindowHandled(win) {
    /* 0 = Normal Window, 3 = (non-modal) dialog */
    return win.get_window_type() == 0 || win.get_window_type() == 3;
}

function _placeWindow(win, ws) {
    if (win == null) {
        return;
    }

    if (_isWindowHandled(win)) {
        // If any other visible windows exists, abort and rely on current placement
        let numExistingWindows = ws.list_windows().filter(function(item) {
            return item !== win && _isWindowHandled(item) && !item.minimized;
        }).length;

        if (numExistingWindows > 0) {
            debugLog(
                "Window \"" + win.get_title() + "\": not placed, " +
                numExistingWindows + " other windows exist"
            );
            return;
        }

        // No other visible windows, place window in top-left corner
        let workArea = win.get_work_area_current_monitor();
        let x = workArea.x;
        let y = workArea.y;

        if (win.decorated) {
            win.move_frame(true, x, y);
        } else {
            win.move(true, x, y);
        }
        debugLog("Window \"" + win.get_title() + "\" placed at " + x + ", " + y);
    }
}

function _onWorkspaceAdded() {
    this._onDisconnectSignals();
    let workspace;
    for (let i = 0; i < global.screen.n_workspaces; i++) {
        workspace = global.screen.get_workspace_by_index(i);
        this._signals.push(workspace.connect(
            'window-added',
            Lang.bind(this, this._onWindowAdded)
        ));
    }
}

function _onDisconnectSignals() {
    for (let i = 0; i < this._signals.length; i++) {
        global.screen.disconnect(this._signals[i]);
        this._signals[i] = 0;
    }
    this._signals = [];
}

function init() {
    debugLog("init");
}

function enable() {
    debugLog("enable");
    this.workspaceAddedId = global.screen.connect(
        'workspace-added',
        Lang.bind(this, this._onWorkspaceAdded)
    );
    this._onWorkspaceAdded();
};

function disable() {
    debugLog("disable");
    global.screen.disconnect(workspaceAddedId);
    this._onDisconnectSignals();
};
