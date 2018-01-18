const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;

let _workspaceAddedSignal;
let _workspaceSignals;

let verbose = true;

function debugLog() {
    if (verbose) {
        let args = [].slice.call(arguments);
        args.unshift("[better-window-placement] DEBUG");
        global.log.apply(global, args);
    }
}

function _onWindowAdded(ws, win) {
    /* Newly-created windows are added to the workspace before
     * the compositor knows about them: get_compositor_private() is null.
     */
    let actor = win.get_compositor_private();
    if (!actor) {
        Mainloop.idle_add(function () {
            _onWindowAdded(ws, win);
            return false; // one-time event
        });
    } else {
        _placeWindow(win, ws);
    }
}

function _isWindowHandled(win) {
    /* 0 = Normal Window, 3 = (non-modal) dialog */
    return (win.get_window_type() == 0 || win.get_window_type() == 3) &&
        !win.minimized && !win.fullscreen;
}

function _placeWindow(win, ws) {
    if (win == null || !_isWindowHandled(win)) {
        return;
    }

    // If any other visible windows exists, abort and rely on current placement
    let numExistingWindows = ws.list_windows().filter(function(item) {
        return item !== win && _isWindowHandled(item);
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

    // Defer the actual move since the window-added signal is emitted before
    // the initial window placement.
    Mainloop.idle_add(function () {
        win.move_frame(false, x, y);
        debugLog("Window \"" + win.get_title() + "\" placed at " + x + ", " + y);
        return false;
    });
}

function _onWorkspaceAdded() {
    _onDisconnectSignals();
    for (let i = 0; i < global.screen.n_workspaces; i++) {
        let workspace = global.screen.get_workspace_by_index(i);
        if (_workspaceSignals.has(workspace)) {
            continue;
        }
        let sigHdlrId = workspace.connect(
            'window-added',
            _onWindowAdded
        );
        _workspaceSignals.set(workspace, sigHdlrId);
    }
}

function _onDisconnectSignals() {
    for (let i = 0; i < global.screen.n_workspaces; i++) {
        let workspace = global.screen.get_workspace_by_index(i);
        if (!_workspaceSignals.has(workspace)) {
            continue;
        }
        let sigHdlrId = _workspaceSignals.get(workspace);
        workspace.disconnect(sigHdlrId);
        _workspaceSignals.delete(workspace);
    }
    _workspaceSignals.clear();
}

function init() {
    debugLog("init");
}

function enable() {
    _workspaceSignals = new Map();
    debugLog("enable");
    _workspaceAddedSignal = global.screen.connect(
        'workspace-added',
        _onWorkspaceAdded
    );
    _onWorkspaceAdded();
}

function disable() {
    debugLog("disable");
    global.screen.disconnect(_workspaceAddedSignal);
    _onDisconnectSignals();
    _workspaceSignals = null;
}
