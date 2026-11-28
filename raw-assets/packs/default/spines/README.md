# raw-assets/spines

Drop your Spine exports here. AssetPack picks them up automatically (the spine
pipes ship inside `pixiPipes()` in `.assetpack.js`) and bundles them into
`public/assets/` + `manifest.json`. This README is ignored by the build
(`**/*.md` is in the `ignore` list), so it won't become an asset.

## ⚠️ Version lock — read this first

The runtime is **`@esotericsoftware/spine-pixi-v8` 4.2**. A skeleton exported from
a **different major.minor** of the Spine editor will fail to load. So you MUST
author and export from **Spine editor 4.2.x**. (Check the exact patch we're on
with `cat package.json | grep spine-pixi`.)

There is **no free Spine editor** — the trial can't export. Either buy Spine
Essential (one-time, ~\$69) or animate programmatically instead (see
`src/demoslot/components/symbols/SymbolAnimations.ts`, which uses `Tweener`).

## Export recipe (Spine editor → this folder)

Export as **JSON** (easier to inspect while learning; `.skel` binary also works):

1. **File → Export → JSON**
2. Enable **Create atlas** (Texture Packer settings):
   - Pack settings: Premultiply alpha **off** unless you configure PMA in the
     runtime; leave defaults if unsure.
   - Atlas extension: `.atlas`
3. Output three files with the **same base name**, e.g. a "blob":
   ```
   raw-assets/spines/
     blob.json     ← skeleton (animations, bones, slots)
     blob.atlas    ← atlas descriptor (which regions live where)
     blob.png      ← packed texture (atlas page)
   ```
   The base names of the `.json`/`.skel` and `.atlas` don't have to match each
   other, but keeping them identical keeps the aliases predictable.

## Aliases produced

With `createShortcuts` + `trimExtensions` (see `.assetpack.js`), the manifest
entries come out roughly as:

```
spines/blob.json   (skeleton)   — also shortcut "blob.json"
spines/blob.atlas  (atlas)      — also shortcut "blob.atlas"
```

After `pnpm assets:build`, **open `public/assets/manifest.json` and confirm the
exact alias strings** — then pass them to `SpineCharacter` (see
`src/demoslot/components/spine/SpineCharacter.ts`).

## Build & verify

```bash
pnpm assets:build
# then check what got generated:
#   public/assets/spines/
#   grep -A2 spines public/assets/manifest.json
```

Spine assets land in the `default` bundle, which `CoreController` loads at boot,
so no extra loader wiring is needed for a first character.
