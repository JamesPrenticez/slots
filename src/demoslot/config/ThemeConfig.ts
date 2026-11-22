/**
 * ThemeConfig — the swappable "skin" for a game title.
 *
 * This is the template hook: a new title copies demoslot and only edits the
 * values here to point at its own art. Right now it drives the CharacterArea
 * overlay, which can be rendered two ways:
 *
 *   - `sprite` — a single still PNG (fast, no tooling needed)
 *   - `spine`  — a Spine 4.2 skeletal animation (see raw-assets/spines/README.md)
 *
 * GameCharacter reads `THEME.character` and builds whichever the config names,
 * so switching art never touches component or command code.
 */

import type { CharacterAnimation } from "../../fanfarebaseslot/CharacterAnimation.js";

export type SpriteCharacterTheme = {
	kind: "sprite";
	/** Texture alias from manifest.json (e.g. "character"). */
	texture: string;
};

export type SpineCharacterTheme = {
	kind: "spine";
	/** Skeleton alias from manifest.json (a ".skel" or ".json"). */
	skeleton: string;
	/** Atlas alias from manifest.json (a ".atlas"). */
	atlas: string;
	/** Animation to loop on load — a semantic key or a raw skeleton name. */
	idle?: string;
	/** Skin name to attach, for skeletons that ship multiple skins. */
	skin?: string;
	/** Extra uniform scale applied on top of the fit-to-box scaling. Defaults to 1. */
	scale?: number;
	/**
	 * Maps semantic animation keys → this skeleton's actual animation names.
	 * Unmapped names passed to play()/queue() are used verbatim.
	 */
	animations?: Partial<Record<CharacterAnimation, string>>;
};

export type CharacterTheme = SpriteCharacterTheme | SpineCharacterTheme;

export type GameTheme = {
	character: CharacterTheme;
};

export const THEME: GameTheme = {
	// ── PNG character (default) ────────────────────────────────────────────────
	character: { kind: "sprite", texture: "character" }

	// ── Spine character (Halloween sample) ─────────────────────────────────────
	// Swap the line above for the block below to render the animated skeleton.
	// Aliases + animation names come from public/assets/manifest.json after
	// `pnpm assets:build`. The Halloween skeleton exposes: idle, still, attack,
	// hurt, invisible — and skins: pumpkin, frank, witch, skull.
	//
	// character: {
	//   kind: "spine",
	//   skeleton: "spines/halloween/HalloweenCreature.skel",
	//   atlas:    "spines/halloween/HalloweenCreature_xl.atlas",
	//   idle:     "still",
	//   skin:     "pumpkin",
	//   // Semantic key → Halloween's real animation names. Game code calls
	//   // play("max-win"); this table decides what actually runs.
	//   animations: {
	//     idle:      "still",
	//     spin:      "idle",
	//     win:       "die",
	//     "big-win": "attack",
	//     "max-win": "attack",
	//     lose:      "hurt",
	//     interact:  "hurt"
	//   },
	// },
};
