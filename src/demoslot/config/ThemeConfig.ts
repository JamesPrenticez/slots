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
 *
 * A pack is one GameTheme. `PACKS` lists them; `THEME` is the active one,
 * picked by `?pack=<name>` or the last choice saved by `setActivePack()`.
 */

import type { CharacterAnimation } from "../../fanfarebaseslot/CharacterAnimation.js";
import type { SoundTheme } from "../../slot/sound/SoundTheme.js";

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

export type FreeSpinIntroTheme = {
	/** Choreography preset name, see FREE_SPIN_INTRO_ANIMS in FreeSpinIntroAnim.ts. */
	anim: string;
	/** Texture alias templates; `{tier}` is replaced with the tier below. */
	textures: { glow: string; plate: string; title: string };
	/** Free-spin count awarded (3/4/5 scatters) → art tier. Falls back to the `3` entry. */
	tierByMode: Record<number, 1 | 2 | 3>;
	/** Vertical gaps between stack rows (design px; negative = overlap). */
	gaps: { titleToWon: number; wonToPlate: number; plateToFreeSpin: number; freeSpinToButton: number };
	/** Stack offset from screen centre, as a fraction of design height. */
	stackYOffset: number;
	/** Plate / title width as a fraction of design width. */
	plateWidth: number;
	titleWidth: number;
	/** Glow rotation, radians per ms. */
	glowRotationSpeed: number;
	/** Pre-reveal scale multipliers. */
	startScale: { title: number; plate: number; youWon: number; freeSpin: number; count: number; glow: number };
	text: { youWon: string; freeSpin: string; button: string };
};

export type FreeSpinOutroTheme = {
	/** Choreography preset name, see FREE_SPIN_OUTRO_ANIMS in FreeSpinOutroAnim.ts. */
	anim: string;
	textures: { glow: string; plate: string; cutlery: string; title: string };
	/** `{n}` is replaced with the number of free spins played. */
	text: { subtitle: string; button: string };
	/** Fractions of design width. */
	plateWidth: number;
	titleWidth: number;
	cutleryWidth: number;
	titleToPlateGap: number;
	plateToButtonGap: number;
	/** Stack offset from screen centre, as a fraction of design height. */
	stackYOffset: number;
	/** Glow rotation, radians per ms. */
	glowRotationSpeed: number;
	/** Pre-reveal scale multipliers. */
	startScale: { all: number; glow: number };
};

export type FreeSpinRetriggerTheme = {
	/** Choreography preset name, see FREE_SPIN_RETRIGGER_ANIMS in FreeSpinRetriggerAnim.ts. */
	anim: string;
	textures: { glow: string; title: string };
	/** `upgrade` maps the new mode (4/5) to its banner text. */
	text: { youWon: string; freeSpin: string; button: string; upgrade: Record<number, string> };
	overlayAlpha: number;
	gaps: { titleToWon: number; wonToNumber: number; numberToFreeSpin: number; freeSpinToButton: number };
	/** Upward shift as a fraction of screen height. */
	verticalOffsetRatio: number;
	startScale: { title: number; youWon: number; freeSpin: number };
	glowRotationSpeed: number;
	/** Upper bound for, and margin around, the fit-to-screen scale. */
	maxFitScale: number;
	fitMargin: number;
};

export type BigWinTheme = {
	/** Choreography preset name, see BIG_WIN_ANIMS in BigWinAnim.ts. */
	anim: string;
	/** Texture alias templates; `{tier}` is the tier's `assetTier` (1-4). */
	textures: { glow: string; plate: string; title: string };
	/** Fractions of design width. */
	plateWidth: number;
	titleWidth: number;
	/** Win-amount text width as a multiple of the plate width, measured against `winTextReference`. */
	winTextWidthRatio: number;
	winTextReference: string;
	/** Title→plate gap as a fraction of the title height (negative = overlap). */
	titleToPlateGapRatio: number;
	overlayAlpha: number;
};

export type SymbolsTheme = {
	/** Motion preset name, see SYMBOL_ANIMS in SymbolAnimations.ts. */
	anim: string;
	/** Symbol id → texture alias. Ids not listed fall back to SYMBOL_DEFINITIONS in GameConfig. */
	textures: Record<string, string>;
	/** Tint applied to dimmed (non-winning) symbols. */
	blurTint: number;
	/** Win highlight box drawn behind a winning symbol. */
	highlight: {
		color: number;
		fillAlpha: number;
		strokeAlpha: number;
		strokeWidth: number;
		radius: number;
		/** Px shaved off each side of the cell. */
		inset: number;
	};
	/** Parameters for the preset's winPulse. */
	winPulse: { count: number; maxScale: number; durationMs: number };
};

export type SparklesTheme = {
	count: number;
	color: number;
	shape: { kind: "star"; outer: number; inner: number } | { kind: "sprite"; texture: string; size: number };
	/** Random scale range [min, max]. */
	scale: [number, number];
	/** Min distance from centre as a fraction of the radius (0.5 = keep toward the edge). */
	edgeBias: number;
	/** Random ms ranges [min, max] for each phase of one twinkle. */
	timing: {
		initialStagger: [number, number];
		fadeIn: [number, number];
		hold: [number, number];
		fadeOut: [number, number];
		rest: [number, number];
	};
};

export type BackgroundsTheme = {
	/** Texture aliases. */
	main: string;
	bonus: string;
	logo: string;
	reel: string;
	reelBonus: string;
	bonusIntro: string;
	bonusIntroCharacter: string;
	/** Logo size multiplier per layout. */
	logoScale: { landscape: number; portrait: number; desktop: number };
};

export type SplashHero = {
	img: string;
	mode: "width" | "contain";
	cx: number;
	cy: number;
	boxW: number;
	boxH?: number;
};

export type SplashCard = {
	tileKey: string;
	artDef: SplashHero;
	titleKey: string;
	titleCx: number;
	titleCy: number;
	titleBoxW: number;
	/** Degrees. */
	titleRot: number;
	body: string;
};

export type SplashTheme = {
	background: string;
	logo: string;
	blurStrength: number;
	pressText: string;
	card: { width: number; height: number; body: { cx: number; cy: number; wrap: number; size: number } };
	cards: SplashCard[];
	/** Screen-size ratios (0..1 of screen width/height). */
	layout: {
		landscape: { logoW: number; logoY: number; cardsY: number; cardH: number; cardGap: number; btnY: number };
		portrait: { logoW: number; logoY: number; cardW: number; cardsY: number; dotsY: number; btnY: number };
	};
	carousel: { advanceMs: number; slideMs: number };
	/** "Press to continue" pulse: fades to `minAlpha` and back, `halfMs` each way. */
	pulse: { minAlpha: number; halfMs: number };
	/** Card hover: lift (px), scale multiplier, tilt (radians). */
	hover: { lift: number; scale: number; tilt: number };
};

export type MultiplierTier = {
	/** Multiplier at or above which this tier applies. */
	threshold: number;
	bgTexture: string;
	/** Label outline and top→bottom gradient colours. */
	strokeColor: number;
	gradientStart: number;
	gradientEnd: number;
};

export type MultiplierTheme = {
	/** Sorted descending: the first tier whose threshold the multiplier meets wins. */
	tiers: MultiplierTier[];
	/** Same rule; used for cells that hold a slime. */
	slimeTiers: { threshold: number; bgTexture: string }[];
	bgScale: number;
	label: {
		/** Text before the number, e.g. "×". */
		prefix: string;
		fontFamily: string;
		fontWeight: string;
		/** Font size / gradient height as a fraction of the symbol size. */
		sizeRatio: number;
		heightRatio: number;
		strokeWidth: number;
	};
};

export type FreeSpinCounterTheme = {
	/** `{current}` and `{total}` are replaced. */
	text: string;
	style: { fontSize: number; fill: number; fontWeight: string };
	/** Px above the top of the reels. */
	offsetAbove: number;
};

export type GameTheme = {
	character: CharacterTheme;
	freeSpinIntro: FreeSpinIntroTheme;
	freeSpinOutro: FreeSpinOutroTheme;
	freeSpinRetrigger: FreeSpinRetriggerTheme;
	bigWin: BigWinTheme;
	symbols: SymbolsTheme;
	sparkles: SparklesTheme;
	sounds: SoundTheme;
	backgrounds: BackgroundsTheme;
	splash: SplashTheme;
	multipliers: MultiplierTheme;
	freeSpinCounter: FreeSpinCounterTheme;
};

const FREE_SPIN_INTRO: FreeSpinIntroTheme = {
	anim: "default",
	textures: { glow: "Glow_Tier{tier}.png", plate: "Plate_Tier{tier}.png", title: "Title_Tier{tier}.png" },
	tierByMode: { 3: 1, 4: 2, 5: 3 },
	gaps: { titleToWon: -140, wonToPlate: -130, plateToFreeSpin: -60, freeSpinToButton: 80 },
	stackYOffset: -0.05,
	plateWidth: 0.25,
	titleWidth: 0.5,
	glowRotationSpeed: 0.00015,
	startScale: { title: 0.8, plate: 0, youWon: 0.6, freeSpin: 0.6, count: 0.6, glow: 0.86 },
	text: { youWon: "YOU WON", freeSpin: "FREE SPINS!", button: "PRESS TO CONTINUE" }
};

const FREE_SPIN_OUTRO: FreeSpinOutroTheme = {
	anim: "default",
	textures: {
		glow: "Glow_TotalWin.png",
		plate: "Plate_TotalWin.png",
		cutlery: "Plate_Cutlery.png",
		title: "Title_TotalWin.png"
	},
	text: { subtitle: "{n} FREE SPINS!", button: "PRESS TO CONTINUE" },
	plateWidth: 0.25,
	titleWidth: 0.48,
	cutleryWidth: 0.42,
	titleToPlateGap: -40,
	plateToButtonGap: 110,
	stackYOffset: -0.03,
	glowRotationSpeed: 0.0004,
	startScale: { all: 0.85, glow: 0.86 }
};

const FREE_SPIN_RETRIGGER: FreeSpinRetriggerTheme = {
	anim: "default",
	textures: { glow: "Glow_Tier2.png", title: "Title_Retrigger.png" },
	text: {
		youWon: "YOU WON!",
		freeSpin: "FREE SPINS!",
		button: "PRESS TO CONTINUE",
		upgrade: { 4: "UPGRADED TO MAIN COURSE", 5: "UPGRADED TO FINAL FEAST" }
	},
	overlayAlpha: 0.75,
	gaps: { titleToWon: -20, wonToNumber: -60, numberToFreeSpin: -60, freeSpinToButton: 90 },
	verticalOffsetRatio: 0.08,
	startScale: { title: 0.8, youWon: 0.8, freeSpin: 0.8 },
	glowRotationSpeed: 0.00015,
	maxFitScale: 1,
	fitMargin: 0.9
};

const BIG_WIN: BigWinTheme = {
	anim: "default",
	textures: { glow: "Win_Glow_Tier{tier}.png", plate: "Win_Plate_Tier{tier}.png", title: "Win_Title_Tier{tier}.png" },
	plateWidth: 0.2,
	titleWidth: 0.3,
	winTextWidthRatio: 1.8,
	winTextReference: "$888,888.88",
	titleToPlateGapRatio: -0.35,
	overlayAlpha: 0.75
};

const SYMBOLS: SymbolsTheme = {
	anim: "default",
	textures: {},
	blurTint: 0x595959,
	highlight: { color: 0xffd700, fillAlpha: 0.28, strokeAlpha: 0.8, strokeWidth: 2, radius: 8, inset: 6 },
	winPulse: { count: 2, maxScale: 1.1, durationMs: 800 }
};

const SPARKLES: SparklesTheme = {
	count: 10,
	color: 0xffffff,
	shape: { kind: "star", outer: 14, inner: 5 },
	scale: [0.4, 1.3],
	edgeBias: 0.5,
	timing: {
		initialStagger: [0, 600],
		fadeIn: [220, 440],
		hold: [80, 220],
		fadeOut: [220, 440],
		rest: [150, 650]
	}
};

const SOUNDS: SoundTheme = {
	music: {
		base: {
			base: "AN_OLD_FASHIONED_8BarLoop_BASS",
			lightDrums: "AN_OLD_FASHIONED_8BarLoop_BASS_LIGHTDRUMS",
			guitarDrums: "AN_OLD_FASHIONED_8BarLoop_BASS_GUITAR_LIGHTDRUMS",
			escalation: "AN_OLD_FASHIONED_8BarLoop_ESC2"
		},
		bonus: {
			base: "ALL-STAR_SWING_BAND_Base_8BarLoop",
			escalation: "ALL-STAR_SWING_BAND_Esc1_8BarLoop",
			winPayout: "ALL-STAR_SWING_BAND_WinPayout_8BarLoop",
			winIdle: "ALL-STAR_SWING_BAND_WinPayout_Idle2_8BarLoop",
			bonusEnd: "ALL-STAR_SWING_BAND_BonusEndContinue"
		}
	},
	sfx: {
		spinClick: "FTS_SpinButtonClick",
		uiClick: "ui_click",
		featuresOpen: "temp_btn_features_open",
		hover: "temp_btn_hover",
		reelSlowRoll: "FTS_ReelDrop_SlowRoll",
		drumRoll: "FTS_DrumRoll",
		scatterDrop: [
			"FTS_ScatterDrop1_v2",
			"FTS_ScatterDrop2_v2",
			"FTS_ScatterDrop3_v2",
			"FTS_ScatterDrop4_v2",
			"FTS_ScatterDrop5_v2"
		],
		slimeDrop: "FTS_SlimeDrop",
		superSlimeDrop: "FTS_SuperSlimeDrop",
		symbolBurst: "FTS_SlimeBurst_2",
		characterQuip: "FTS_Gloop_Quip1",
		clusterSweet: "FTS_SweetHighPayingSymbol_v2",
		clusterSavory: "FTS_SeasonBite_v3",
		clusterDefault: "FTS_Sizzle_v2",
		winTier: ["FTS_WinPayout_BigWin", "FTS_WinPayout_MegaWin", "FTS_WinPayout_EpicWin", "FTS_WinPayout_Jackpot"]
	},
	cluster: { sweet: ["H2", "H3"], savory: ["H1", "H4"] },
	preload: {
		tier1: [
			"FTS_SpinButtonClick",
			"FTS_ReelDrop_Simple",
			"FTS_ReelDrop_Simple_WaterFX",
			"FTS_ReelDrop_SlowRoll",
			"FTS_ReelDrop_Tumble1",
			"FTS_ScatterDrop1_v2",
			"FTS_ScatterDrop2_v2",
			"FTS_ScatterDrop3_v2",
			"FTS_ScatterDrop4_v2",
			"FTS_ScatterDrop5_v2",
			"FTS_SeasonBite_v3",
			"FTS_SweetHighPayingSymbol_v2",
			"FTS_Sizzle_v2",
			"FTS_SlimeDrop"
		],
		tier2: [
			"FTS_Gloop_Quip1",
			"FTS_Gloop_Quip2",
			"FTS_Gloop_Quip3",
			"FTS_SlimeBurst_2",
			"FTS_SlimeSpinner",
			"FTS_SuperSlimeDrop",
			"FTS_DrumRoll",
			"FTS_BonusEnter_Slime",
			"FTS_BonusEnter_Continue",
			"FTS_BonusPayout_Impact1",
			"FTS_BonusPayout_Impact2",
			"FTS_BonusPayout_Impact3"
		],
		bonus: [
			"FTS_FreeSpins_Trigger",
			"FTS_FreeSpins_Retrigger",
			"FTS_FreeSpins_Complete",
			"FTS_WinPayout_BigWin",
			"FTS_WinPayout_MegaWin",
			"FTS_WinPayout_EpicWin",
			"FTS_WinPayout_Jackpot",
			"FTS_Multiplier_Reveal",
			"FTS_Multiplier_Increase"
		]
	}
};

const BACKGROUNDS: BackgroundsTheme = {
	main: "background",
	bonus: "Bg-Bonus",
	logo: "logo",
	reel: "reelBg",
	reelBonus: "reelBg-bonus",
	bonusIntro: "BonusIntroBG.png",
	bonusIntroCharacter: "BonusIntro_Character.png",
	logoScale: { landscape: 0.55, portrait: 0.55, desktop: 1.0 }
};

const SPLASH: SplashTheme = {
	background: "background.png",
	logo: "logo.png",
	blurStrength: 10,
	pressText: "PRESS TO CONTINUE",
	card: { width: 382, height: 500, body: { cx: 191, cy: 390, wrap: 342, size: 22 } },
	cards: [
		{
			tileKey: "kraid-tile.png",
			titleKey: "kraid-title.png",
			artDef: { img: "kraid-open.png", mode: "width", cx: 191, cy: 87, boxW: 309 },
			titleCx: 192,
			titleCy: 279,
			titleBoxW: 266,
			titleRot: 1.05,
			body: "Land 3+ Bonus Symbols to enter Gloop's Kitchen Raid Bonuses!"
		},
		{
			tileKey: "gloop-tile.png",
			titleKey: "gloop-title.png",
			artDef: { img: "gloop-art.png", mode: "contain", cx: 185, cy: 95, boxW: 350, boxH: 230 },
			titleCx: 191,
			titleCy: 281,
			titleBoxW: 289,
			titleRot: -0.94,
			body: "Gloop Symbols Streak across the board. Super Gloop leaves Slime Frames!"
		},
		{
			tileKey: "meal-tile.png",
			titleKey: "meal-title.png",
			artDef: { img: "meal-art.png", mode: "contain", cx: 193, cy: 94, boxW: 360, boxH: 268 },
			titleCx: 193,
			titleCy: 289,
			titleBoxW: 356,
			titleRot: 0,
			body: "Serving up a MAX WIN of 25,000 times your bet!"
		}
	],
	layout: {
		landscape: { logoW: 0.1, logoY: 0.12, cardsY: 0.25, cardH: 0.45, cardGap: 0.03, btnY: 0.92 },
		portrait: { logoW: 0.42, logoY: 0.06, cardW: 0.82, cardsY: 0.18, dotsY: 0.76, btnY: 0.88 }
	},
	carousel: { advanceMs: 2800, slideMs: 450 },
	pulse: { minAlpha: 0.15, halfMs: 650 },
	hover: { lift: 16, scale: 1.035, tilt: 0.14 }
};

const MULTIPLIERS: MultiplierTheme = {
	tiers: [
		{
			threshold: 1024,
			bgTexture: "1024x_Bg.png",
			strokeColor: 0x9dec9b,
			gradientStart: 0x007228,
			gradientEnd: 0x2b9964
		},
		{ threshold: 128, bgTexture: "128x_Bg.png", strokeColor: 0xa26fe0, gradientStart: 0x3a0a99, gradientEnd: 0x643eaf },
		{ threshold: 16, bgTexture: "16x_Bg.png", strokeColor: 0xf29c62, gradientStart: 0xad2300, gradientEnd: 0xbf5338 },
		{ threshold: 2, bgTexture: "2x_Bg.png", strokeColor: 0xe4a668, gradientStart: 0x4c290b, gradientEnd: 0x71553e }
	],
	// 256x and 1024x share the top asset since only three slime textures exist.
	slimeTiers: [
		{ threshold: 256, bgTexture: "slime_Tier3.png" },
		{ threshold: 16, bgTexture: "slime_Tier2.png" },
		{ threshold: 2, bgTexture: "slime_Tier1.png" }
	],
	bgScale: 0.6,
	label: { prefix: "×", fontFamily: "Titan One", fontWeight: "900", sizeRatio: 0.28, heightRatio: 0.3, strokeWidth: 3 }
};

const FREE_SPIN_COUNTER: FreeSpinCounterTheme = {
	text: "FREE SPIN {current}/{total}",
	style: { fontSize: 20, fill: 0x17cde5, fontWeight: "bold" },
	offsetAbove: 50
};

/**
 * All packs. Add one by adding a key — it appears in the debug-menu switcher.
 * Art, audio and spines are not named here: they come from raw-assets/packs/<name>/
 * under the same file names as `default` (see raw-assets/packs/README.md).
 */
export const PACKS = {
	default: {
		character: { kind: "sprite", texture: "character" },
		freeSpinIntro: FREE_SPIN_INTRO,
		freeSpinOutro: FREE_SPIN_OUTRO,
		freeSpinRetrigger: FREE_SPIN_RETRIGGER,
		bigWin: BIG_WIN,
		symbols: SYMBOLS,
		sparkles: SPARKLES,
		sounds: SOUNDS,
		backgrounds: BACKGROUNDS,
		splash: SPLASH,
		multipliers: MULTIPLIERS,
		freeSpinCounter: FREE_SPIN_COUNTER
	},

	// Halloween Spine sample. Skeleton exposes: idle, still, attack, hurt, invisible
	// and skins: pumpkin, frank, witch, skull. Animation names come from manifest.json.
	halloween: {
		character: {
			kind: "spine",
			skeleton: "spines/halloween/HalloweenCreature.skel",
			atlas: "spines/halloween/HalloweenCreature_xl.atlas",
			idle: "still",
			skin: "pumpkin",
			animations: {
				idle: "still",
				spin: "idle",
				win: "die",
				"big-win": "attack",
				"max-win": "attack",
				lose: "hurt",
				interact: "hurt"
			}
		},
		freeSpinIntro: FREE_SPIN_INTRO,
		freeSpinOutro: FREE_SPIN_OUTRO,
		freeSpinRetrigger: FREE_SPIN_RETRIGGER,
		bigWin: BIG_WIN,
		symbols: SYMBOLS,
		sparkles: SPARKLES,
		sounds: SOUNDS,
		backgrounds: BACKGROUNDS,
		splash: SPLASH,
		multipliers: MULTIPLIERS,
		freeSpinCounter: FREE_SPIN_COUNTER
	}
} satisfies Record<string, GameTheme>;

export type PackName = keyof typeof PACKS;

const STORAGE_KEY = "fanfare.pack";

function resolveActivePack(): PackName {
	try {
		const want = new URLSearchParams(location.search).get("pack") ?? localStorage.getItem(STORAGE_KEY);
		if (want && want in PACKS) return want as PackName;
	} catch {
		// storage/location unavailable — fall through to default
	}
	return "default";
}

export const ACTIVE_PACK: PackName = resolveActivePack();
export const THEME: GameTheme = PACKS[ACTIVE_PACK];

/** Remember the pack and reload. Reload keeps it simple: every view reads THEME once at construction. */
export function setActivePack(name: PackName): void {
	try {
		localStorage.setItem(STORAGE_KEY, name);
	} catch {
		// ignore — ?pack= still works
	}
	// ?pack= wins over storage, so drop it or the switch would be ignored.
	const url = new URL(location.href);
	url.searchParams.delete("pack");
	location.assign(url);
}
