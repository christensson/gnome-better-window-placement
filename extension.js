const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;

let _workspaceAddedSignal;

let _signals = [];

function matrix(numrows, numcols, getInitial) {
    var arr = [];
    for (var i = 0; i < numrows; ++i) {
        var columns = [];
        for (var j = 0; j < numcols; ++j) {
            columns[j] = getInitial();
        }
        arr[i] = columns;
    }
    return arr;
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

function _placeWindow(win, ws) {
    if (win == null) return;
    /* 0 = Normal Window, 3 = (non-modal) dialog */
    if (win.get_window_type() == 0 || win.get_window_type() == 3) {
        let rect = win.get_frame_rect();//Used in 3.12.2

        let monitor = Main.layoutManager.monitors[global.screen.get_current_monitor()];
        let x = monitor.x;
        let y = monitor.y;
        let w = rect.width;
        let h = rect.height;
        let max_w = monitor.width;
        let max_h = monitor.height;

        // Divide screen in squares with size equal to window to be added
        let rows = Math.floor(max_h / h);
        let cols = Math.floor(max_w / w);
        let squares = matrix(rows, cols, () => []);

        global.log("[better] Find placement for (" + win.get_title() + ") - x,y w,h=" + rect.x + "," + rect.y + " " + rect.width + "," + rect.height);
        global.log("[better] rows,cols=" + rows + "," + cols);

        // Populate with old windows
        let windows = ws.list_windows();
        for (let i = 0; i < windows.length; i++) {
            let winType = windows[i].get_window_type();
            if (windows[i] !== win && (winType === 0 || winType === 3) && !windows[i].minimized) {
                let rect = windows[i].get_frame_rect();
                let row0 = Math.floor(rect.y / h);
                let col0 = Math.floor(rect.x / w);
                let rowCnt = Math.ceil(rect.height / h);
                let colCnt = Math.ceil(rect.width / w);
                global.log("[better] Other win: x,y w,h=" + rect.x + "," + rect.y + " " + rect.width + "," + rect.height + " (" + windows[i].get_title() + ")");
                global.log("[better] r,c rows,cols=" + row0 + "," + col0 + " " + rowCnt + "," + colCnt);
                for (let r = row0; r < Math.min(row0 + rowCnt, rows); r++) {
                    for (let c = col0; c < Math.min(col0 + colCnt, cols); c++) {
                        global.log("[better] Occupied row=" + r + ", col=" + c + " (" + windows[i].get_title() + ")");
                        squares[r][c].push(windows[i]);
                    }
                }
            }
        }

        global.log("[better] Occupied pos rows=" + rows + ", cols=" + cols);
        for (let r = 0; r < rows; r++) {
          let row = "";
          for (let c = 0; c < cols; c++) {
            if (squares[r][c].length > 0) {
              row = row + "o";
            } else {
              row = row + " ";
            }
          }
          global.log("[better] (" + r + ") : " + row);
        }

        // Find first available slot
        let foundPlacement = false;
        let foundRow;
        let foundCol;
        for (let c = 0; c < cols && !foundPlacement; c++) {
          for (let r = 0; r < rows; r++) {
            if (squares[r][c].length === 0) {
              foundRow = r;
              foundCol = c;
              x = c * w;
              y = r * h;
              global.log("[better] Found slot at row=" + r + ", col=" + c + " -> " + x + ", " + y + " (" + win.get_title() + ")");
              foundPlacement = true;
              break;
            }
          }
        }

        if (foundPlacement) {
          global.log("[better] window (" + win.get_title() + ") rough placement is " + x + ", " + y);
          // Pack placement north
          let packedN = false;
          if (foundRow > 0) {
            const r = foundRow - 1;
            const windowsN = squares[r][foundCol];
            y = windowsN.map((win) => win.get_frame_rect()).reduce(
              (acc, rect) => Math.max(acc, rect.y + rect.height),
              h * r
            );
            packedN = true;
            global.log("[better] window (" + win.get_title() + ") moved north to y=" + y);
          }

          // Pack placement left
          if (foundCol > 0) {
            const c = foundCol - 1;
            const windowsW = squares[foundRow][c];
            const maxXW = windowsW.map((win) => win.get_frame_rect()).reduce(
              (acc, rect) => Math.max(acc, rect.x + rect.width),
              w * c
            );
            let maxXNW = maxXW;
            if (packedN) {
              const windowsNW = squares[foundRow - 1][c];
              maxXNW = windowsNW.map((win) => win.get_frame_rect()).reduce(
                (acc, rect) => Math.max(acc, rect.x + rect.width),
                w * c
              );
            }
            x = Math.max(maxXNW, maxXW);
            global.log("[better] window (" + win.get_title() + ") moved west to x=" + x);
          }

          if (win.decorated) {
                  win.move_frame(true, x, y);
              } else {
                  win.move(true, x, y);
              }
          global.log("[better] window (" + win.get_title() + ") placed at " + x + ", " + y);
        } else {
          global.log("[better] Found no placement for (" + win.get_title() + ")");
        }
    }
}

function _onWorkspaceAdded() {
    this._onDisconnectSignals();
    let workspace;
    for (let i = 0; i < global.screen.n_workspaces; i++) {
        workspace = global.screen.get_workspace_by_index(i);
        this._signals.push(workspace.connect('window-added', Lang.bind(this, this._onWindowAdded)));
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
    global.log("[better] init");
}

function enable() {
    global.log("[better] enable");
    this.workspaceAddedId = global.screen.connect('workspace-added', Lang.bind(this, this._onWorkspaceAdded));
    this._onWorkspaceAdded();
};

function disable() {
    global.log("[better] disable");
    global.screen.disconnect(workspaceAddedId);
    this._onDisconnectSignals();
};
