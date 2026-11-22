# FanfareBaseSlot Framework

Multi-game slot framework by FANFARE STUDIOS. Built on PixiJS v8 + React + TypeScript.
Current game: **DemoSlot** (`src/demoslot/`)

---

## Project structure

````
src/
  fanfarebaseslot/          ← Framework core (never touch)
    FanfareBaseSlotApplication.ts
    Command.ts  Controller.ts  ViewStore.ts

  common/                 ← Framework engine (rarely touch)
    commands/             ← Spin, Stop, Win, AutoPlay commands
    components/results/   ← BetLines, BigWinsEffect base classes
    controllers/          ← AutoPlayController
    models/data/          ← BalanceData, BetData, WinData
    net/                  ← OutcomeProvider interface + mock
    util/                 ← Tweener, easings, AbortableDelay, math

  slot/                   ← Game engine (extend per game)
    renderer/             ← Reel, ReelWindow, Resizable
    components/layout/    ← GameArea, LogoArea, ScreenSafeArea
    components/slotmachine/  ← SlotMachine base
    components/results/   ← WinEffect base
    controllers/          ← CoreController (abstract), SlotMachineController

  demoslot/               ← DemoSlot game (one folder per game title)
    config/               ← GameConfig.ts, AssetManifest.ts, SymbolConverter.ts
    data/                 ← GameModel.ts
    net/                  ← MockRGS.ts, GameRGSTypes.ts
    commands/             ← OpenGameCommand, PlayFreeSpinsCommand
    components/           ← GameSlotMachine, GameBackground, GameWinEffect, SymbolView
    controllers/          ← FanfareBaseSlotController.ts (main entry)
    scenes/               ← BaseGameScene.ts
    sound/                ← GameSoundManager.ts
    index.ts              ← getGameController() entry point

  engine/GameBridge.ts    ← ONLY React → PixiJS channel
  stores/                 ← Zustand: gameStore (PixiJS writes, React reads), audio, modal, bottom bar
  components/             ← React HUD: bottom-bar/*-section, modals, balance, hud
  game-ui/                ← IconButton, Button, BonusButton + --ui-* tokens
  ui/                     ← React shell: App, PixiCanvas, icons, assets

raw-assets/demoslot/      ← DROP ARTIST FILES HERE
  sprites/
    symbols{tps}/         ← 10 symbol PNGs → symbols.webp + symbols.json
    ui{tps}/              ← UI PNGs → ui.webp + ui.json
    backgrounds/          ← Background PNGs → bg.webp
  audio/                  ← WAV files → .mp3 + .ogg
  spines{nc}/             ← Spine exports → copied as-is

## Getting started

```bash
npm install
npm run dev           # builds assets then starts Vite dev server
````

If you haven't added raw assets yet:

```bash
npm run dev:no-assets   # skip assetpack, use placeholders
```

---

## Asset pipeline

```
Artist drops files        npm run assets:build       Game loads
raw-assets/demoslot/  ──────────────────────────►  public/assets/demoslot/

symbols{tps}/*.png    → sprites/symbols.webp + symbols.json  (one GPU upload)
ui{tps}/*.png         → sprites/ui.webp + ui.json
backgrounds/*.png     → sprites/background.webp
audio/*.wav           → audio/*.mp3 + *.ogg
spines{nc}/*          → spines/* (copied as-is)
```

---

## Adding a second game

1. Create `src/yourgame/` (copy `src/demoslot/` as template)
2. Create `raw-assets/yourgame/` with same folder structure
3. Update `App.tsx` to import from `../yourgame/index.js`
4. Run `npm run assets:build`

---

## Commands

```bash
npm run dev              # assets:build + vite dev server
npm run dev:no-assets    # vite dev server only (skip asset pipeline)
npm run build            # assets:build + tsc + vite build (production)
npm run assets:build     # run assetpack once
npm run assets:watch     # run assetpack in watch mode (re-runs on file save)
npm run assets:clean     # delete all generated assets (re-run assets:build after)
npm test                 # vitest
npm run lint             # eslint
```
