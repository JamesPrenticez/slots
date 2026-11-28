# Asset packs

One folder per pack. `default` is the complete base; every other pack only needs the files it changes.

```
packs/
  default/
    sprites{tps}/    packed into ONE atlas (symbols, plates, titles, glows…)
    backgrounds/     backgrounds, logo, reel backgrounds
    characters/      still-PNG character
    audio{bundle}/   sfx + music (wav/mp3 → m4a)
    spines/          Spine skeletons
  halloween/
    spines/halloween/…   (only what it overrides)
```

## Rules

- **Same file name = same asset.** `halloween/backgrounds/background.png` replaces `default`'s. Code never changes; it asks for `"background"`.
- **The sprite atlas is all-or-nothing.** If a pack has `sprites{tps}/`, it replaces the whole default atlas, so it must contain every sprite `default` has. Everything else falls back per file.
- Anything the pack's `THEME` names (spine skeleton, texture aliases in `ThemeConfig.ts`) must exist in that pack or in `default`.

## Workflow

```bash
pnpm assets:build    # raw-assets/packs/* → public/assets/packs/*
pnpm assets:check    # what each pack overrides / is missing
```

Switch packs with the debug menu, or `?pack=<name>` in the URL.
