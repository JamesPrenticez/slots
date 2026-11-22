import { Howl, Howler } from "howler";
import { Assets } from "pixi.js";

import { useAudioStore, useGameStore } from "@stores";

import type { BehaviourState } from "../../common/CoreState.js";

/** Base-game BGM layers — streamed, never fully buffered. */
const BASE_BGM = {
	base: "AN_OLD_FASHIONED_8BarLoop_BASS",
	lightDrums: "AN_OLD_FASHIONED_8BarLoop_BASS_LIGHTDRUMS",
	guitarDrums: "AN_OLD_FASHIONED_8BarLoop_BASS_GUITAR_LIGHTDRUMS",
	escalation: "AN_OLD_FASHIONED_8BarLoop_ESC2"
} as const;

/** Bonus-game BGM layers — streamed, never fully buffered. */
const BONUS_BGM = {
	base: "ALL-STAR_SWING_BAND_Base_8BarLoop",
	escalation: "ALL-STAR_SWING_BAND_Esc1_8BarLoop",
	winPayout: "ALL-STAR_SWING_BAND_WinPayout_8BarLoop",
	winIdle: "ALL-STAR_SWING_BAND_WinPayout_Idle2_8BarLoop",
	bonusEnd: "ALL-STAR_SWING_BAND_BonusEndContinue"
} as const;

const BONUS_MODES: ReadonlySet<BehaviourState> = new Set(["FREE_SPINS", "FREE_ROUNDS"]);

// ── SFX tiers ───────────────────────────────────────────────────────────────

/**
 * Tier 1 — preloaded BEFORE the game shows.
 * These are the sounds needed on the very first spin / interaction.
 */
const SFX_TIER1: readonly string[] = [
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
];

/**
 * Tier 2 — preloaded NON-BLOCKING after the game becomes visible.
 * Quips, burst effects, bonus-entry stings.
 */
const SFX_TIER2: readonly string[] = [
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
];

/**
 * Bonus SFX — preloaded on-demand during the bonus intro animation,
 * so they are ready before the player can trigger them.
 */
const SFX_BONUS: readonly string[] = [
	"FTS_FreeSpins_Trigger",
	"FTS_FreeSpins_Retrigger",
	"FTS_FreeSpins_Complete",
	"FTS_WinPayout_BigWin",
	"FTS_WinPayout_MegaWin",
	"FTS_WinPayout_EpicWin",
	"FTS_WinPayout_Jackpot",
	"FTS_Multiplier_Reveal",
	"FTS_Multiplier_Increase"
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve an asset-pack alias to its content-hashed URL.
 * Returns an empty array (non-fatal) if the alias is not in the manifest.
 *
 * Howler handles relative URLs (e.g. "./assets/audio/file-hash.m4a") fine —
 * no normalization needed; passing the URL as-is avoids "/./assets/..." issues.
 */
const audioSrc = (alias: string): string[] => {
	const url = Assets.resolver.resolveUrl(alias) as string | undefined;
	if (!url) {
		console.warn(`[SoundManager] alias not resolved: "${alias}"`);
		return [];
	}
	return [url];
};

// ── Manager ──────────────────────────────────────────────────────────────────

/**
 * GameSoundManager — singleton audio controller for Feed the Slime.
 *
 * ALL audio (BGM + SFX) uses Web Audio API
 *
 * Public API
 * ──────────
 *   sound.playSfx(alias)          one-shot SFX (polyphonic)
 *   sound.playLoop(alias)         start a looping SFX
 *   sound.stopLoop(alias)         stop a looping SFX
 *   sound.stop(alias)             stop all instances of one alias
 *   sound.stopAll()               stop everything (BGM + all SFX)
 *   sound.streamMusic(alias, ms)  crossfade to any BGM alias
 *   sound.stopMusic()             stop BGM immediately
 *   sound.playBaseBGM()           BGM convenience wrappers
 *   sound.playBonusBGM()
 *   sound.playWinPayoutBGM()
 *   sound.playWinIdleBGM()
 *   sound.playBonusEndBGM()
 *   sound.escalateBaseBGM()
 *   sound.escalateBonusBGM()
 *   sound.onWinTier(1|2|3|4)     duck BGM + play win sting
 *   sound.onWinComplete()         restore BGM volume after win counter
 */
export class GameSoundManager {
	// ── Singleton ──────────────────────────────────────────────────────────
	private static instance: GameSoundManager | undefined;

	public static getInstance(): GameSoundManager {
		GameSoundManager.instance ??= new GameSoundManager();
		return GameSoundManager.instance;
	}

	private constructor() {}
	private readonly bgm = new Map<string, Howl>();
	private music: Howl | undefined = undefined;
	private outgoingMusic: Howl | undefined = undefined;

	private currentMusicAlias: string | undefined = undefined;
	private musicDuckFactor = 1;
	private musicReady = false;

	private pendingBGMAlias: string | undefined = undefined;

	// ── SFX pool ───────────────────────────────────────────────────────────
	private readonly sfx = new Map<string, Howl>();

	private unsubscribeAudio: (() => void) | undefined = undefined;
	private unsubscribeBehaviour: (() => void) | undefined = undefined;
	private lastBehaviour: BehaviourState = "NORMAL";

	// ── Audio unlock ───────────────────────────────────────────────────────
	private audioUnlockBound: (() => void) | undefined = undefined;

	// ── Init ───────────────────────────────────────────────────────────────
	public async init(): Promise<void> {
		if (import.meta.env.DEV) {
			// Howler's private pool internals — not in its type definitions.
			const howler = Howler as unknown as { _obtainHtml5Audio: () => HTMLAudioElement; _html5AudioCnt: number };
			const orig = howler._obtainHtml5Audio;
			howler._obtainHtml5Audio = function () {
				const used = howler._html5AudioCnt;
				const limit = Howler.html5PoolSize;
				console.error(
					`[SoundManager] ⚠️ HTML5 audio allocated (${used}/${limit})` +
						` — find and remove html5:true from this caller:`,
					new Error("html5-trace")
				);
				return orig.call(Howler);
			};
		}

		Howler.html5PoolSize = 100;

		this.applySettings(useAudioStore.getState());
		this.unsubscribeAudio ??= useAudioStore.subscribe(s => this.applySettings(s));
		this.wireBehaviourEvents();
		this.installAudioUnlock();
	}

	// GameSoundManager.ts — add near the top with the other const blocks
	SWEET_HIGH_PAY = new Set(["H2", "H3"]); // ← your actual IDs
	SAVORY_HIGH_PAY = new Set(["H1", "H4"]); // ← your actual IDs

	public clusterSfx(symbolIds: string[]): string {
		for (const id of symbolIds) {
			if (this.SWEET_HIGH_PAY.has(id)) return "FTS_SweetHighPayingSymbol_v2";
			if (this.SAVORY_HIGH_PAY.has(id)) return "FTS_SeasonBite_v3";
		}
		return "FTS_Sizzle_v2";
	}

	private installAudioUnlock(): void {
		if (this.audioUnlockBound) return;

		this.audioUnlockBound = () => {
			document.removeEventListener("pointerdown", this.audioUnlockBound!);
			this.audioUnlockBound = undefined;

			const ctx = Howler.ctx;
			if (ctx && ctx.state !== "running") {
				ctx
					.resume()
					.then(() => this.drainPendingBGM())
					.catch(() => this.drainPendingBGM());
			} else {
				this.drainPendingBGM();
			}
		};

		document.addEventListener("pointerdown", this.audioUnlockBound, { once: true });
	}

	private drainPendingBGM(): void {
		if (!this.pendingBGMAlias) return;
		const alias = this.pendingBGMAlias;
		this.pendingBGMAlias = undefined;

		this.streamMusicInternal(alias);
	}

	// ── SFX tiers ─────────────────────────────────────────────────────────

	public async preloadSFX(): Promise<void> {
		await this.loadHowls(SFX_TIER1);
	}
	public async preloadSFXBackground(): Promise<void> {
		await this.loadHowls(SFX_TIER2);
	}
	public async preloadBonusSFX(): Promise<void> {
		await this.loadHowls(SFX_BONUS);
	}

	private async loadHowls(aliases: readonly string[]): Promise<void> {
		const toLoad = aliases.filter(a => !this.sfx.has(a));
		await Promise.all(
			toLoad.map(
				alias =>
					new Promise<void>(resolve => {
						const src = audioSrc(alias);
						if (!src.length) {
							resolve();
							return;
						}
						const { sfxVolume } = useAudioStore.getState();
						const howl = new Howl({
							src,
							preload: true,
							volume: sfxVolume,
							// No html5: true
							onload: () => resolve(),
							onloaderror: (_id, err) => {
								console.warn(`[SoundManager] SFX load error "${alias}":`, err);
								this.sfx.delete(alias);
								resolve();
							}
						});
						this.sfx.set(alias, howl);
					})
			)
		);
	}

	// ── BGM ────────────────────────────────────────────────────────────────

	public streamMusic(alias: string, fadeDuration = 800): void {
		// If already playing this track, do nothing.
		if (this.currentMusicAlias === alias && !this.pendingBGMAlias) return;

		const src = audioSrc(alias);
		if (!src.length) return;

		// Mark ready so wireBehaviourEvents can fire BGM switches after unlock.
		this.musicReady = true;

		// Autoplay guard: queue if AudioContext is suspended or not yet created.
		const ctx = Howler.ctx;
		if (!ctx || ctx.state === "suspended") {
			this.pendingBGMAlias = alias;
			return;
		}

		this.streamMusicInternal(alias, fadeDuration);
	}

	/**
	 * Performs the actual crossfade. Only called when the AudioContext is
	 * confirmed running (either via streamMusic directly, or via drainPendingBGM).
	 */
	private streamMusicInternal(alias: string, fadeDuration = 800): void {
		if (this.currentMusicAlias === alias) return;

		const src = audioSrc(alias);
		if (!src.length) return;

		// Abort any in-flight fade-out.
		if (this.outgoingMusic) {
			this.outgoingMusic.off("fade");
			this.outgoingMusic.stop();
			this.outgoingMusic = undefined;
		}

		// Fade out the current track; stop (not unload) when silent.
		if (this.music) {
			const outgoing = this.music;
			this.outgoingMusic = outgoing;
			outgoing.fade(outgoing.volume(), 0, fadeDuration);
			outgoing.once("fade", () => {
				outgoing.stop(); // stays cached in bgm — do NOT unload
				if (this.outgoingMusic === outgoing) this.outgoingMusic = undefined;
			});
		}

		// Get or create the incoming BGM Howl (Web Audio, no html5: true).
		let incoming = this.bgm.get(alias);
		if (!incoming) {
			incoming = new Howl({
				src,
				loop: true,
				volume: 0,
				format: ["m4a"],
				preload: true,
				onloaderror: () => {
					console.warn(`[SoundManager] BGM load error: "${alias}"`);
					this.bgm.delete(alias);
					if (this.currentMusicAlias === alias) this.stopMusic();
				}
			});
			this.bgm.set(alias, incoming);
		}

		this.music = incoming;
		this.currentMusicAlias = alias;

		const { musicVolume } = useAudioStore.getState();
		incoming.play();
		incoming.fade(0, musicVolume * this.musicDuckFactor, fadeDuration);
	}

	public stopMusic(): void {
		this.pendingBGMAlias = undefined;
		if (this.outgoingMusic) {
			this.outgoingMusic.off("fade");
			this.outgoingMusic.stop();
			this.outgoingMusic = undefined;
		}
		this.music?.stop();
		this.music = undefined;
		this.currentMusicAlias = undefined;
		this.musicReady = false;
	}

	// ── BGM convenience wrappers ───────────────────────────────────────────

	public playBaseBGM(): void {
		this.streamMusic(BASE_BGM.base);
	}
	public playBonusBGM(): void {
		this.streamMusic(BONUS_BGM.base);
	}
	public playWinPayoutBGM(): void {
		this.streamMusic(BONUS_BGM.winPayout);
	}
	public playWinIdleBGM(): void {
		this.streamMusic(BONUS_BGM.winIdle);
	}
	public playBonusEndBGM(): void {
		this.streamMusic(BONUS_BGM.bonusEnd);
	}
	public escalateBaseBGM(): void {
		this.streamMusic(BASE_BGM.escalation);
	}
	public escalateBonusBGM(): void {
		this.streamMusic(BONUS_BGM.escalation);
	}

	public playBaseLightDrumsBGM(): void {
		this.streamMusic(BASE_BGM.lightDrums);
	}

	// ── SFX public API ────────────────────────────────────────────────────

	public playSfx(alias: string): void {
		let howl = this.sfx.get(alias);
		if (!howl) {
			const src = audioSrc(alias);
			if (!src.length) return;
			const { sfxVolume } = useAudioStore.getState();
			howl = new Howl({
				src,
				volume: sfxVolume,
				onloaderror: (_id, err) => {
					console.warn(`[SoundManager] SFX lazy-load error "${alias}":`, err);
					this.sfx.delete(alias);
				}
			});
			this.sfx.set(alias, howl);
		}
		howl.play();
		console.log("Played SFX: ", alias);
	}

	public playLoop(alias: string): void {
		let howl = this.sfx.get(alias);
		if (!howl) {
			const src = audioSrc(alias);
			if (!src.length) return;
			const { sfxVolume } = useAudioStore.getState();
			howl = new Howl({
				src,
				loop: true,
				volume: sfxVolume,
				onloaderror: (_id, err) => {
					console.warn(`[SoundManager] loop load error "${alias}":`, err);
					this.sfx.delete(alias);
				}
			});
			this.sfx.set(alias, howl);
		}
		if (!howl.playing()) howl.play();
	}

	public stopLoop(alias: string): void {
		this.sfx.get(alias)?.stop();
	}
	public stop(alias: string): void {
		this.sfx.get(alias)?.stop();
	}

	public stopAll(): void {
		this.stopMusic();
		for (const howl of this.sfx.values()) howl.stop();
	}

	// ── Win escalation ────────────────────────────────────────────────────

	public onWinTier(tier: 1 | 2 | 3 | 4): void {
		this.musicDuckFactor = 0.25;
		if (this.music) {
			const { musicVolume } = useAudioStore.getState();
			this.music.fade(this.music.volume(), musicVolume * this.musicDuckFactor, 400);
		}
		const stings: Record<number, string> = {
			1: "FTS_WinPayout_BigWin",
			2: "FTS_WinPayout_MegaWin",
			3: "FTS_WinPayout_EpicWin",
			4: "FTS_WinPayout_Jackpot"
		};
		const alias = stings[tier];
		if (alias) this.playSfx(alias);
	}

	public onWinComplete(): void {
		this.musicDuckFactor = 1;
		if (this.music) {
			const { musicVolume } = useAudioStore.getState();
			this.music.fade(this.music.volume(), musicVolume, 600);
		}
	}

	// ── Settings sync ─────────────────────────────────────────────────────

	private applySettings(state: { masterVolume: number; musicVolume: number; sfxVolume: number; muted: boolean }): void {
		Howler.mute(state.muted);
		Howler.volume(state.masterVolume);
		if (this.music) this.music.volume(state.musicVolume * this.musicDuckFactor);
		for (const howl of this.sfx.values()) howl.volume(state.sfxVolume);
	}

	// ── Behaviour wiring ──────────────────────────────────────────────────

	private wireBehaviourEvents(): void {
		this.unsubscribeBehaviour ??= useGameStore.subscribe(state => {
			if (!this.musicReady) return;
			if (state.behaviourState === this.lastBehaviour) return;
			this.lastBehaviour = state.behaviourState;
			if (BONUS_MODES.has(state.behaviourState)) {
				this.playBonusBGM();
			} else {
				this.playBaseBGM();
			}
		});
	}

	public tryUnlockAudio(): void {
		const ctx = Howler.ctx;
		if (!ctx || ctx.state === "running") {
			this.drainPendingBGM();
			return;
		}
		ctx
			.resume()
			.then(() => this.drainPendingBGM())
			.catch(() => {});
	}

	// ── Cleanup ───────────────────────────────────────────────────────────

	public destroy(): void {
		this.unsubscribeAudio?.();
		this.unsubscribeBehaviour?.();
		this.unsubscribeAudio = undefined;
		this.unsubscribeBehaviour = undefined;

		if (this.audioUnlockBound) {
			document.removeEventListener("pointerdown", this.audioUnlockBound);
			this.audioUnlockBound = undefined;
		}

		this.pendingBGMAlias = undefined;

		if (this.outgoingMusic) {
			this.outgoingMusic.off("fade");
			this.outgoingMusic.stop();
			this.outgoingMusic = undefined;
		}
		this.music?.stop();
		this.music = undefined;

		for (const howl of this.bgm.values()) howl.unload();
		this.bgm.clear();

		for (const howl of this.sfx.values()) {
			howl.stop();
			howl.unload();
		}
		this.sfx.clear();

		GameSoundManager.instance = undefined;
	}
}
