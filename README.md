# Harry's Chess

A browser chess game where you play White against Harry's Black pieces. The game
uses a canvas board and a local minimax search with alpha-beta pruning. No account
or online chess service is required.

## Play on Windows

1. Download or clone the project, keeping its files together.
2. Install Python 3 with `pythonw.exe` available on your `PATH`.
3. Double-click `Launch Harrys Chess.vbs` to open the game.
4. To create a desktop icon named **Harry's Chess**, run `Create Desktop Shortcut.vbs`.

The launcher starts a windowless local server at `http://127.0.0.1:8778/index.html`.
It opens Microsoft Edge in an app window when Edge is installed, or uses your
default browser. It reuses the game's existing server when one is already running
and reports a conflict if another service occupies the port.

`Launch Harrys Chess.bat` is an alternative launcher that displays errors in a
console. `Launch Bowser Chess.bat` remains as a compatibility entry point for old
shortcuts. `Create Desktop Shortcut.ps1` creates the same desktop shortcut as the
VBS script. Recreate the shortcut if you move the project folder.

## Run in any desktop browser

From the project directory, run:

```sh
python serve.py
```

Open `http://127.0.0.1:8778/index.html`. The server uses Python's standard library;
the game has no npm dependencies or build step. On systems where Python 3 is
named `python3`, use `python3 serve.py`.

## Controls and features

- Click a piece and its destination, or drag it. Clicking another White piece
  changes the selection. Right-click or Escape cancels it.
- Keyboard: type the source square, then the destination, such as `e2` then `e4`.
- Promotion: move to the back rank and choose Queen, Rook, Bishop, or Knight.
  Use the chooser buttons or press `Q`, `R`, `B`, or `N`.
- Castling, en passant, check, checkmate, stalemate, insufficient material,
  the 50-move draw, and threefold repetition are supported. The game automatically
  declares its supported draws.
- Easy, Medium, and Expert request search depths of 2, 3, and 5 respectively.
  Iterative deepening has a time budget, so a move may use a lower completed depth.
- Legal-move dots, capture rings, the last move, check, captured pieces, full move
  history, and PGN download help you follow the game.
- Undo returns control to White and cancels a pending AI reply.
- **Watch Harry vs Harry** enables autoplay; **Stop watching** returns to play.

## Development and checks

The game logic, renderer, and controls are in `index.html`. `serve.py` is the local
server, and the manifest and service worker support browser app/offline use.

With Node.js 18 or newer installed, run the regression checks from the project
directory:

```sh
npm test
```

No `npm install` is needed. The tests use Node's built-in modules and committed
fixtures to execute the production game script with inert browser and timer
stubs. They cover input and captures, promotion, render geometry, game lifecycle,
AI choices and scheduling, move records, and board sizing. Manual browser testing
remains useful for checking interaction and appearance on your device.

The browser console also exposes `window.__game.status()`, `newGame(diff)`,
`press(from, to)`, `forceMove(san)`, `undo()`, `setDifficulty(diff)`, and `vars()`
on `window.__game`. Difficulty values are `0`, `1`, and `2`.

## Contributions

Suggestions and pull requests are welcome. The repository owner,
[@kcmrshll9-ux](https://github.com/kcmrshll9-ux), controls changes to the project
and must approve outside contributions before they can be merged.
