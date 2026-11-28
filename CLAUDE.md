# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                 # vite dev server (no asset build)
pnpm dev:with-assets     # assets:build then vite dev server
pnpm build               # assets:build + tsc + vite build (production)
pnpm assets:build        # run assetpack once (raw-assets → public/assets)
pnpm assets:watch        # assetpack in watch mode
pnpm assets:clean        # rimraf public/assets/demoslot (re-run assets:build after)
pnpm audio:m4a           # transcode mp3 → m4a (scripts/mp3-to-m4a.sh)
pnpm test                # vitest
pnpm lint                # eslint ./src
```

Dev server runs at `http://localhost:3000`.

## Architecture

This is **FanfareBaseSlot** — a multi-game slot machine framework built on PixiJS v8 + React 19 + TypeScript. The code is organized in four source layers:

- `src/fanfarebaseslot/` — engine primitives shared by every title: `Command`/`Controller`, `ViewStore`, `CharacterAnimation` vocabulary, the Pixi `Application` wrapper
- `src/common/` — reusable game logic: Commands (spin, cascade, win presentation, auto-play), `CoreState`, models, the `OutcomeProvider` network contract, and utilities
- `src/slot/` — reusable presentation/view base classes: `SlotMachine`/`CascadeSlotMachine`, reel renderers (`Reel`, `CascadeReel`, `ReelWindow`), layout (`GameArea`, `ControlBar`, `CharacterArea`, …), character views, `GameSoundManager`
- `src/demoslot/` — the concrete game title: subclasses the `slot`/`common` bases, its own config/theme, symbols, multiplier layer, splash/free-spin screens, and the JPS + Mock RGS adapters

The framework core is `fanfarebaseslot` + `common` + `slot`; game titles live in isolated folders (currently only `src/demoslot/`).

### Layer separation

There are three runtime layers that must stay decoupled:

1. **PixiJS game engine** (`src/slot/`, `src/demoslot/`, `src/common/`, `src/fanfarebaseslot/`) — runs a WebGL render loop, owns all game logic and state
2. **React HUD** (`src/components/`, `src/ui/`) — renders balance, bet, win display and HUD buttons as DOM elements over the canvas. `src/components/bottom-bar/` holds one `*-section.tsx` per control; `src/game-ui/` holds the shared button primitives (`IconButton`, `Button`, `BonusButton`)
3. **Bridge layer** (`src/engine/GameBridge.ts`, `src/stores/gameStore.ts`) — the only legal crossing points between layers

React → PixiJS: call `GameBridge.getInstance().requestSpin()` (and similar). The game controller registers handlers on GameBridge.  
PixiJS → React: game code calls setters on `useGameStore` (Zustand); React reads the store and rerenders.

Never import PixiJS classes in React components. Never import React hooks in game code.

### Command pattern

All game logic is split into single-purpose `Command` objects (`src/fanfarebaseslot/Command.ts`). Commands are async and extend `Controller`, so they can execute sub-commands. The lifecycle is:

1. `Controller.executeCommand(cmd)` — runs the command, stores it as `lastCommand` (used by cancel/quickstop)
2. `cmd.execute()` — does its async work (network, animations, delays)
3. `cmd.onCompleted(value)` — signals completion; the controller's `onCompletedCommand()` decides what runs next based on `value`

Cancellation: `cmd.cancel()` sets `CoreState` to `"CANCELING"` so the running command can detect and exit early.

New command names must be added to the `KnownCommand` union in `src/fanfarebaseslot/Command.ts` for type-safe `onCompletedCommand` switching.

### State machine

`CoreState` (`src/common/CoreState.ts`) is the global state machine — a static singleton with two independent axes:

- `ReelDisplayState` — what the reels/presentation are doing now (`IDLE`, `SPINNING`, `STOPPING`, `WINPRESENTATION`, etc.)
- `BehaviourState` — overall game mode (`NORMAL`, `AUTO_PLAY`, `FREE_SPINS`, `FREE_ROUNDS`)

Every state change mirrors to Zustand (`useGameStore.setGameState`) so the React HUD rerenders automatically.

### ViewStore

`ViewStore` (`src/fanfarebaseslot/ViewStore.ts`) is a typed registry that decouples Commands from PixiJS view implementations. Views self-register on construction (`ViewStore.getInstance().set("SlotMachine", this)`); Commands retrieve them by name (`ViewStore.getInstance().get("SlotMachine")`). Adding a new view requires adding its entry to the `ViewMap` type in `ViewStore.ts`.

### Cascade / tumble mechanic

The game is a cascading (tumble) slot, not a fixed-lines spin. A round is a loop:

- `CascadeCommand` / `CascadeSpinCommand` (`src/common/commands/`) drive the loop; `CascadeReel` and `CascadeSlotMachine` (`src/slot/`) render tumbles as symbols are removed and new ones fall in.
- Each iteration pulls one `StepResult` from the `OutcomeProvider` (see below), animates the removal/refill, applies multipliers, then continues based on `nextAction` (`"tumble"` → keep going, `"cashout"`/`"done"` → settle, `"free_spin"`/`"free_spin_tumble"` → free-spin flow).

### RGS / network layer

Game outcomes come from an `OutcomeProvider` (`src/common/net/OutcomeProvider.ts`) — a two-phase contract: `spin()` opens a round and returns the initial grid, then `nextStep()` is called repeatedly, each returning one `StepResult` (wins, positions to remove, refill symbols, multiplier cells, `nextAction`). Two implementations:

- `MockRGS` (`src/demoslot/net/MockRGS.ts`) — pre-computes the whole round's cascade steps locally for offline dev.
- `JPSRGSAdapter` (`src/demoslot/net/JPSRGSAdapter.ts`) — talks to the real JPS RGS over `JPSClient` (`POST /game/play` with `{start}`/`{next}`). The round stays **open** on the server between calls; network failures throw `RGSNetworkError` and leave the round resumable on reload.

### Character overlay

An optional themeable character (Spine skeleton or static PNG) reacts to gameplay. `CharacterAnimation` (`src/fanfarebaseslot/CharacterAnimation.ts`) defines a stable semantic vocabulary (`idle`, `spin`, `win`, `big-win`, `max-win`, `lose`, `interact`); each title's `ThemeConfig` maps those names to its own skeleton's animation names, so Command code (`spine.play("max-win")`) is title-agnostic. Views: `GameCharacter` (PNG) and `SpineCharacter` (`src/slot/components/`), placed in `CharacterArea`. The character is a pure Pixi overlay behind the DOM HUD — visible HUD chrome sets `pointer-events: all` so clicks don't fall through to it.

### Multipliers

Cascade steps can attach multiplier cells to grid positions. `MultiplierCellLayer` (`src/demoslot/components/multipliers/`) renders them; it is registered in the `ViewMap` and driven from the cascade commands via the per-step `multiplierCells` data.

### Sound

`GameSoundManager` (`src/slot/sound/GameSoundManager.ts`) owns SFX/music; import it via the `@sound-manager` alias.

### Asset pipeline

Config lives in `.assetpack.js`. Raw artist files are grouped **by asset pack**: `raw-assets/packs/<pack>/` (see `raw-assets/packs/README.md`). AssetPack builds them to `public/assets/packs/<pack>/`, and `src/engine/assets.ts` merges the `default` pack with the active one at boot (`?pack=` / debug-menu switcher), stripping the `packs/<name>/` prefix — so game code always uses bare names (`sprites{tps}/sym_h1.png` → `"sym_h1.png"`, `audio/FTS_x.wav` → `"FTS_x"`). A pack only ships the files it changes, except the sprite atlas, which is replaced whole. `pnpm assets:check` reports each pack's overrides and missing sprites.

Per-folder processing inside a pack:

- `sprites{tps}/*.png` → packed texture atlas (`texturePacker`, padding 4, max 4096)
- `backgrounds/*.png` → optimized textures
- `audio{bundle}/*.wav|mp3` → `.m4a` (128 kbps, 44.1 kHz)
- `spines/` (with per-skeleton subfolders) and `characters/` → copied through

A `manifest.json` is generated at `public/assets/manifest.json` and loaded by the game at boot.

### Adding a new game title

1. Create `src/yourgame/` — copy `src/demoslot/` as the template
2. Create `raw-assets/yourgame/` with the same folder structure
3. Update `src/ui/App.tsx` to import from `../yourgame/index.js`
4. Update `assets:clean` script in `package.json` if needed
5. Run `npm run assets:build`

### Path aliases (vite.config.ts)

- `fanfarebaseslot` → `src/fanfarebaseslot`
- `@stores` → `src/stores`
- `@game-ui` → `src/game-ui`
- `@components/*` → `src/components/*`
- `@hooks/*` → `src/hooks/*`
- `@fanfare/util` → `src/common/util`
- `@ui/helpers` → `src/ui/helpers`
- `@sound-manager` → `src/slot/sound/GameSoundManager.ts`
