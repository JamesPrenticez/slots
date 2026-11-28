import { Howl, Howler } from "howler";
import { Assets } from "pixi.js";

import { useAudioStore, useGameStore } from "@stores";

import type { BehaviourState } from "../../common/CoreState.js";
import type { SfxKey, SoundTheme } from "./SoundTheme.js";

const BONUS_MODES: ReadonlySet<BehaviourState> = new Set(["FREE_SPINS", "FREE_ROUNDS"]);

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
 *   sound.cue(key, i?)            one-shot SFX for a SoundTheme key (what game code should use)
 *   sound.loopCue / stopLoopCue   looping SFX for a SoundTheme key
 *   sound.playSfx(alias)          one-shot SFX by raw alias (polyphonic)
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

	// ── Sound theme (which file plays for each moment) ─────────────────────
	private theme: SoundTheme | undefined = undefined;

	/** Set the pack's sound map. Call once, before init() or any playback. */
	public configure(theme: SoundTheme): void {
		this.theme = theme;
	}

	private get t(): SoundTheme {
		if (!this.theme) throw new Error("GameSoundManager.configure(theme) was not called");
		return this.theme;
	}

	private alias(key: SfxKey, i = 0): string {
		const v = this.t.sfx[key];
		return typeof v === "string" ? v : v[Math.min(i, v.length - 1)];
	}

	/** Play the one-shot SFX the theme maps to `key` (`i` picks from a list, clamped). */
	public cue(key: SfxKey, i = 0): void {
		this.playSfx(this.alias(key, i));
	}
	public loopCue(key: SfxKey): void {
		this.playLoop(this.alias(key));
	}
	public stopLoopCue(key: SfxKey): void {
		this.stopLoop(this.alias(key));
	}

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

	public clusterSfx(symbolIds: string[]): string {
		const { sweet, savory } = this.t.cluster;
		for (const id of symbolIds) {
			if (sweet.includes(id)) return this.alias("clusterSweet");
			if (savory.includes(id)) return this.alias("clusterSavory");
		}
		return this.alias("clusterDefault");
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
		await this.loadHowls(this.t.preload.tier1);
	}
	public async preloadSFXBackground(): Promise<void> {
		await this.loadHowls(this.t.preload.tier2);
	}
	public async preloadBonusSFX(): Promise<void> {
		await this.loadHowls(this.t.preload.bonus);
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
		this.streamMusic(this.t.music.base.base);
	}
	public playBonusBGM(): void {
		this.streamMusic(this.t.music.bonus.base);
	}
	public playWinPayoutBGM(): void {
		this.streamMusic(this.t.music.bonus.winPayout);
	}
	public playWinIdleBGM(): void {
		this.streamMusic(this.t.music.bonus.winIdle);
	}
	public playBonusEndBGM(): void {
		this.streamMusic(this.t.music.bonus.bonusEnd);
	}
	public escalateBaseBGM(): void {
		this.streamMusic(this.t.music.base.escalation);
	}
	public escalateBonusBGM(): void {
		this.streamMusic(this.t.music.bonus.escalation);
	}

	public playBaseLightDrumsBGM(): void {
		this.streamMusic(this.t.music.base.lightDrums);
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
		this.cue("winTier", tier - 1);
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
