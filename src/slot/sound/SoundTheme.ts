/**
 * SoundTheme — which audio file plays for each game moment.
 *
 * Code asks for a semantic key (`sound.cue("slimeDrop")`); the pack's theme says
 * which file that is. Values are audio aliases, i.e. file names (no extension)
 * from raw-assets/packs/<pack>/audio{bundle}/.
 */

/** A key whose value is a list is indexed: `cue("scatterDrop", 2)` → third entry (clamped). */
export type SfxKey =
	| "spinClick"
	| "uiClick"
	| "featuresOpen"
	| "hover"
	| "reelSlowRoll"
	| "drumRoll"
	| "scatterDrop"
	| "slimeDrop"
	| "superSlimeDrop"
	| "symbolBurst"
	| "characterQuip"
	| "clusterSweet"
	| "clusterSavory"
	| "clusterDefault"
	| "winTier";

export type SoundTheme = {
	/** Streamed BGM layers. */
	music: {
		base: { base: string; lightDrums: string; guitarDrums: string; escalation: string };
		bonus: { base: string; escalation: string; winPayout: string; winIdle: string; bonusEnd: string };
	};
	sfx: Record<SfxKey, string | readonly string[]>;
	/** Which symbol ids get which cluster-removal sound; anything else uses `clusterDefault`. */
	cluster: { sweet: readonly string[]; savory: readonly string[] };
	/** Aliases to preload. tier1 blocks the first screen, tier2 loads after, bonus loads during the bonus intro. */
	preload: { tier1: readonly string[]; tier2: readonly string[]; bonus: readonly string[] };
};
