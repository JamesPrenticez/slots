/**
 * audioStore — Zustand store for audio settings, shared across layers.
 *
 * This is the legal bridge between the React UI and the PixiJS game layer for
 * audio (see CLAUDE.md layer separation). The UI (MenuModal sliders, AudioButton)
 * reads and writes these values; GameSoundManager (game layer) subscribes to the
 * store and applies changes to Howler. Neither side imports the other.
 *
 * Kept separate from gameStore because these are user preferences that persist
 * across sessions (localStorage), whereas gameplay state must not persist.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AudioStore {
	/** Master volume, 0..1 — scales every track. */
	masterVolume: number;
	/** Background music track volume, 0..1. */
	musicVolume: number;
	/** Sound-effects track volume, 0..1. */
	sfxVolume: number;
	/** Global mute — silences both tracks when true. */
	muted: boolean;

	setMasterVolume: (v: number) => void;
	setMusicVolume: (v: number) => void;
	setSfxVolume: (v: number) => void;
	setMuted: (m: boolean) => void;
	toggleMuted: () => void;
}

export const useAudioStore = create<AudioStore>()(
	persist(
		set => ({
			masterVolume: 1,
			musicVolume: 0.5,
			sfxVolume: 0.8,
			muted: false,

			setMasterVolume: masterVolume => set({ masterVolume }),
			setMusicVolume: musicVolume => set({ musicVolume }),
			setSfxVolume: sfxVolume => set({ sfxVolume }),
			setMuted: muted => set({ muted }),
			toggleMuted: () => set(s => ({ muted: !s.muted }))
		}),
		{ name: "fanfare-audio" }
	)
);
