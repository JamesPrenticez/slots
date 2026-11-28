import { BlurFilter, Graphics, Rectangle, Sprite } from "pixi.js";

import { useGameStore } from "@stores";

import { CascadeSpinCommand } from "../../../common/commands/CascadeSpinCommand.js";
import { createAbortableDelay } from "../../../common/util/AbortableDelay.js";
import { gravityIn, outQuad } from "../../../common/util/Easing.js";
import { Tweener } from "../../../common/util/Tweener.js";
import { GameBridge } from "../../../engine/GameBridge.js";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { Resizable } from "../../../slot/renderer/Resizable.js";
import { THEME } from "../../config/ThemeConfig.js";
import { GameBackground } from "../background/GameBackground.js";
import { FreeSpinIntro } from "./FreeSpinIntro.js";
import { FreeSpinOutro } from "./FreeSpinOutro.js";
import { FreeSpinRetriggerPopup } from "./FreeSpinRetriggerPopup.js";

const BACKGROUND_BLUR_STRENGTH = 6;

// ── Character constants ──────────────────────────────────────────────────────
const CHAR_HEIGHT_RATIO = 1.6;
const CHAR_VISIBLE_W = 0.5;
const CHAR_VISIBLE_H = 0.5;
const CHAR_SLIDE_TARGET_X = 0.5; // slide to horizontal screen centre
const DISMISS_ZOOM = 1.18; // both BG and character scale up 20%
const SLIDE_DURATION = 900;
const HOLD_DURATION = 100;
const FADE_OUT_DURATION = 400;

// ── Intro opening timings ────────────────────────────────────────────────────
const DARK_OVERLAY_ALPHA = 0.82; // how dark the overlay gets
const DARK_PHASE_MS = 1000; // how long the dark fade takes
const POPUP_START_DELAY = 0; // when popup animation + tap-to-dismiss activate

export class FreeSpinScreen extends Resizable {
	private readonly darkOverlay = new Graphics();
	private readonly overlay = Sprite.from(THEME.backgrounds.bonusIntro);
	private readonly intro = new FreeSpinIntro();
	private readonly outro = new FreeSpinOutro();
	private readonly retrigger = new FreeSpinRetriggerPopup();
	private readonly character = Sprite.from(THEME.backgrounds.bonusIntroCharacter);

	private readonly backgroundBlur = new BlurFilter({ strength: 0 });
	private onDismiss?: (() => void) | undefined;
	private onDismissExtra?: (() => void) | undefined;

	private lastTrueScreenX = 0;
	private lastTrueScreenY = 0;
	private lastTrueScreenW = 800;
	private lastTrueScreenH = 600;

	constructor() {
		super();
		ViewStore.getInstance().set("FreeSpinScreen", this);
		this.overlay.anchor.set(0.5);
		this.character.anchor.set(0.5, 1.14);

		// Layering: darkOverlay (black) → door BG → popup content → character
		// Character is last so it renders on top of the darkening overlay.
		this.addChild(this.darkOverlay, this.overlay, this.intro, this.outro, this.retrigger, this.character);

		// FreeSpinScreen container stays at alpha=1 always for the intro.
		// The "dark" effect comes purely from darkOverlay, not the container.
		this.alpha = 0; // open() / showIntro() controls this appropriately
		this.eventMode = "none";
		this.interactiveChildren = false;
		this.intro.visible = false;
		this.outro.visible = false;
		this.retrigger.visible = false;
		this.character.visible = false;
		this.darkOverlay.alpha = 0;
	}

	public forceHide(): void {
		this.visible = false;
		this.eventMode = "none";
	}

	// ── Intro ─────────────────────────────────────────────────────────────────

	public showIntro(count: number, mode: number): Promise<void> {
		this.overlay.visible = true;
		this.overlay.alpha = 0; // hidden until BG_REVEAL_DELAY
		this.darkOverlay.alpha = 0;
		this.character.visible = true;
		this.resetCharacterTransform(); // sets scale + resting position, alpha=1

		// Save resting position, then push character fully off-screen so it
		// can sneak in diagonally during the dark phase.
		const restX = this.character.position.x;
		const restY = this.character.position.y;
		const charW = this.character.texture.width * this.character.scale.x;
		const charH = this.character.texture.height * this.character.scale.y;
		this.character.position.set(
			this.lastTrueScreenX + this.lastTrueScreenW + charW * 0.5, // fully off right
			this.lastTrueScreenY + this.lastTrueScreenH + charH // fully below
		);
		this.character.alpha = 0;

		let isDismissing = false;
		const animatedDismiss = async () => {
			if (isDismissing) return;
			isDismissing = true;
			this.removeAllListeners();
			this.switchBackground(true); // switch immediately on tap, not after animation
			await this.playIntroDismissAnimation();
			this.dismiss();
		};

		this.intro.setup(count, mode, animatedDismiss);
		this.intro.visible = true;
		this.outro.visible = false;
		this.retrigger.visible = false;

		// Container at full alpha immediately — darkness comes from darkOverlay.
		this.alpha = 1;
		this.eventMode = "static";
		this.interactiveChildren = false; // not tappable during dark phase
		GameBridge.getInstance().setHudVisible(false);

		// ── Phase 1: only dark overlay fades in ──────────────────────────────
		// Character stays off-screen and invisible until popup starts.
		void Tweener.getInstance().addTween(this.darkOverlay, {
			alpha: DARK_OVERLAY_ALPHA,
			time: DARK_PHASE_MS,
			easing: gravityIn
		});

		// ── Phase 2 + 3: door BG then popup + character sneak-in ─────────────
		void (async () => {
			void Tweener.getInstance().addTween(this.overlay, { alpha: 1, time: 0, easing: outQuad });
			void Tweener.getInstance().addTween(this.character, { alpha: 1, time: 0, easing: gravityIn });
			void Tweener.getInstance().addTween(this.character.position, {
				x: restX,
				y: restY,
				time: 700,
				easing: outQuad
			});

			await createAbortableDelay(700).promise;
			this.intro.play();

			this.interactiveChildren = true;
			this.on("pointertap", animatedDismiss);
		})();

		if (useGameStore.getState().isAutoSpinning) {
			void createAbortableDelay(POPUP_START_DELAY).promise.then(() => animatedDismiss());
		}

		return new Promise(resolve => {
			this.onDismiss = resolve;
		});
	}
	private async playIntroDismissAnimation(): Promise<void> {
		const charTargetX = this.lastTrueScreenX + this.lastTrueScreenW * CHAR_SLIDE_TARGET_X;
		const charScaleX = this.character.scale.x;
		const charScaleY = this.character.scale.y;
		const overlayScaleX = this.overlay.scale.x;
		const overlayScaleY = this.overlay.scale.y;

		// Beat 1 — dark overlay gone instantly, popup text starts imploding
		this.darkOverlay.alpha = 0;

		// Beat 2 — character slides right + zooms, bg zooms, popup text implodes
		await Promise.all([
			this.intro.playDismissAnimation(),
			Tweener.getInstance().addTween(this.character.position, {
				x: charTargetX,
				time: SLIDE_DURATION,
				easing: outQuad
			}),
			Tweener.getInstance().addTween(this.character.scale, {
				x: charScaleX * DISMISS_ZOOM,
				y: charScaleY * DISMISS_ZOOM,
				time: SLIDE_DURATION,
				easing: outQuad
			}),
			Tweener.getInstance().addTween(this.overlay.scale, {
				x: overlayScaleX * DISMISS_ZOOM,
				y: overlayScaleY * DISMISS_ZOOM,
				time: SLIDE_DURATION,
				easing: outQuad
			})
		]);

		// Beat 3 — hold the zoomed state briefly
		await createAbortableDelay(HOLD_DURATION).promise;

		// Beat 4 — everything fades out together
		await Promise.all([
			Tweener.getInstance().addTween(this.character, { alpha: 0, time: FADE_OUT_DURATION, easing: outQuad }),
			Tweener.getInstance().addTween(this.overlay, { alpha: 0, time: FADE_OUT_DURATION, easing: outQuad })
		]);
	}

	// private async playIntroDismissAnimation(): Promise<void> {
	// 	const ts = new Rectangle(
	// 		this.lastTrueScreenX,
	// 		this.lastTrueScreenY,
	// 		this.lastTrueScreenW,
	// 		this.lastTrueScreenH,
	// 	);
	// 	const charTargetX = ts.x + ts.width * CHAR_SLIDE_TARGET_X;
	// 	const charScaleX = this.character.scale.x;
	// 	const charScaleY = this.character.scale.y;
	// 	const overlayScaleX = this.overlay.scale.x;
	// 	const overlayScaleY = this.overlay.scale.y;

	// 	// Remove dark overlay instantly — only character and BG stay visible
	// 	this.darkOverlay.alpha = 0;

	// 	// Slide + zoom character and BG simultaneously
	// 	await Promise.all([
	// 		this.intro.playDismissAnimation(), // fade composition text
	// 		Tweener.getInstance().addTween(this.character.position, {
	// 			x: charTargetX,
	// 			time: SLIDE_DURATION,
	// 			easing: outQuad,
	// 		}),
	// 		Tweener.getInstance().addTween(this.character.scale, {
	// 			x: charScaleX * DISMISS_ZOOM,
	// 			y: charScaleY * DISMISS_ZOOM,
	// 			time: SLIDE_DURATION,
	// 			easing: outQuad,
	// 		}),
	// 		Tweener.getInstance().addTween(this.overlay.scale, {
	// 			x: overlayScaleX * DISMISS_ZOOM,
	// 			y: overlayScaleY * DISMISS_ZOOM,
	// 			time: SLIDE_DURATION,
	// 			easing: outQuad,
	// 		}),
	// 	]);

	// 	// Hold at zoomed state
	// 	await createAbortableDelay(HOLD_DURATION).promise;

	// 	// Both disappear simultaneously
	// 	await Promise.all([
	// 		Tweener.getInstance().addTween(this.character, { alpha: 0, time: FADE_OUT_DURATION, easing: outQuad }),
	// 		Tweener.getInstance().addTween(this.overlay, { alpha: 0, time: FADE_OUT_DURATION, easing: outQuad }),
	// 	]);
	// }

	// ── Outro / Retrigger ────────────────────────────────────────────────────

	public showOutro(totalWin: number, freeSpinsPlayed: number): Promise<void> {
		this.overlay.visible = true;
		this.overlay.alpha = 1;
		this.darkOverlay.alpha = 0;
		this.character.visible = false;

		const outroDismiss = () => {
			this.switchBackground(false);
			this.dismiss();
		};

		this.outro.setup(totalWin, freeSpinsPlayed, outroDismiss);
		this.outro.visible = true;
		this.intro.visible = false;
		this.retrigger.visible = false;

		const promise = this.open(); // adds generic pointertap → this.dismiss()
		// Replace with the switch-aware version so tapping anywhere also
		// goes through switchBackground, not just the button.
		this.removeAllListeners();
		this.on("pointertap", outroDismiss);
		CascadeSpinCommand.resetTotalFreeSpin();
		return promise;
	}

	public showRetrigger(count: number, modeUpgradeTo?: number): Promise<void> {
		this.overlay.visible = false;
		this.darkOverlay.alpha = 0;
		this.character.visible = false;

		if (ViewStore.getInstance().has("FreeSpinCounter")) {
			ViewStore.getInstance().get("FreeSpinCounter").visible = false;
		}
		this.onDismissExtra = () => {
			if (ViewStore.getInstance().has("FreeSpinCounter")) {
				ViewStore.getInstance().get("FreeSpinCounter").visible = true;
			}
		};

		this.retrigger.setup(count, () => this.dismiss(), modeUpgradeTo);
		this.retrigger.visible = true;
		this.intro.visible = false;
		this.outro.visible = false;
		return this.open();
	}

	/** Switches the game background and reel background textures. bonus=true for free-spin mode, false for base game. */
	public switchBackground(bonus: boolean): void {
		if (ViewStore.getInstance().has("Background")) {
			(ViewStore.getInstance().get("Background") as GameBackground).setBackgroundTexture(
				bonus ? THEME.backgrounds.bonus : THEME.backgrounds.main
			);
		}
		if (ViewStore.getInstance().has("CascadeSlotMachine")) {
			ViewStore.getInstance()
				.get("CascadeSlotMachine")
				.setReelBackground(bonus ? THEME.backgrounds.reelBonus : THEME.backgrounds.reel);
		}
	}

	// ── Resize ────────────────────────────────────────────────────────────────

	protected override resizeDesktop(screen: Rectangle, trueScreen: Rectangle): void {
		this.layout(screen, trueScreen);
	}
	protected override resizeLandscape(screen: Rectangle, trueScreen: Rectangle): void {
		this.layout(screen, trueScreen);
	}
	protected override resizePortrait(screen: Rectangle, trueScreen: Rectangle): void {
		this.layout(screen, trueScreen);
	}

	private layout(screen: Rectangle, trueScreen: Rectangle): void {
		this.position.set(-screen.x, -screen.y);

		this.darkOverlay
			.clear()
			.rect(trueScreen.x, trueScreen.y, trueScreen.width, trueScreen.height)
			.fill({ color: 0x000000, alpha: 1 });

		const { width: iw, height: ih } = this.overlay.texture;
		const coverScale = Math.max(trueScreen.width / iw, trueScreen.height / ih);
		this.overlay.scale.set(coverScale);
		this.overlay.position.set(trueScreen.x + trueScreen.width / 2, trueScreen.y + trueScreen.height / 2);

		this.intro.layout(trueScreen.width / 2, trueScreen.height / 2, trueScreen.width, trueScreen.height);
		this.outro.layout(trueScreen.width / 2, trueScreen.height / 2, trueScreen.width, trueScreen.height);
		this.retrigger.layout(trueScreen.width / 2, trueScreen.height / 2, trueScreen.width, trueScreen.height);

		this.lastTrueScreenX = trueScreen.x;
		this.lastTrueScreenY = trueScreen.y;
		this.lastTrueScreenW = trueScreen.width;
		this.lastTrueScreenH = trueScreen.height;

		this.layoutCharacter(trueScreen);
	}

	private layoutCharacter(trueScreen: Rectangle): void {
		const natH = this.character.texture.height;
		const natW = this.character.texture.width;

		// Height-based scale
		const scaleH = (trueScreen.height * CHAR_HEIGHT_RATIO) / natH;
		// Width cap: visible portion (CHAR_VISIBLE_W fraction) must not
		// exceed 80% of screen width — prevents portrait mode overflow where
		// CHAR_HEIGHT_RATIO produces a character wider than the screen.
		const scaleW = (trueScreen.width * 0.8) / (natW * CHAR_VISIBLE_W);
		const charScale = Math.min(scaleH, scaleW);

		const charH = natH * charScale;
		const charW = natW * charScale;

		this.character.scale.set(charScale);

		// Resting position: CHAR_VISIBLE_W/H of each axis visible at the corner.
		// anchor = (0.5, 1):
		//   visible width  = charW * CHAR_VISIBLE_W (from right edge)
		//   visible height = charH * CHAR_VISIBLE_H (from bottom edge)
		this.character.position.set(
			trueScreen.x + trueScreen.width + charW * (0.5 - CHAR_VISIBLE_W),
			trueScreen.y + trueScreen.height + charH * (1 - CHAR_VISIBLE_H)
		);
	}

	private resetCharacterTransform(): void {
		const ts = new Rectangle(this.lastTrueScreenX, this.lastTrueScreenY, this.lastTrueScreenW, this.lastTrueScreenH);
		this.layoutCharacter(ts);
		this.character.alpha = 1;
	}

	// ── Generic open (outro / retrigger) ─────────────────────────────────────

	private open(): Promise<void> {
		this.alpha = 0;
		this.eventMode = "static";
		GameBridge.getInstance().setHudVisible(false);
		this.interactiveChildren = true;
		this.on("pointertap", () => this.dismiss());

		const fade = { alpha: 0 };
		void Tweener.getInstance().addTween(fade, {
			alpha: 1,
			time: 300,
			easing: gravityIn,
			onUpdate: () => {
				this.alpha = fade.alpha;
			}
		});

		if (ViewStore.getInstance().has("Background")) {
			const bg = ViewStore.getInstance().get("Background");
			this.backgroundBlur.strength = 0;
			bg.filters = [this.backgroundBlur];
			void Tweener.getInstance().addTween(this.backgroundBlur, {
				strength: BACKGROUND_BLUR_STRENGTH,
				time: 300,
				easing: gravityIn
			});
		}

		if (useGameStore.getState().isAutoSpinning) {
			void createAbortableDelay(3000).promise.then(() => this.dismiss());
		}

		return new Promise(resolve => {
			this.onDismiss = resolve;
		});
	}

	private dismiss(): void {
		this.alpha = 0;
		this.eventMode = "none";
		this.intro.stop();
		this.outro.stop();
		this.retrigger.stop();
		this.character.visible = false;
		this.darkOverlay.alpha = 0;
		GameBridge.getInstance().setHudVisible(true);
		this.interactiveChildren = false;
		this.removeAllListeners();

		if (ViewStore.getInstance().has("Background")) {
			const bg = ViewStore.getInstance().get("Background");
			void Tweener.getInstance()
				.addTween(this.backgroundBlur, { strength: 0, time: 200, easing: gravityIn })
				.then(() => {
					bg.filters = [];
				});
		}

		this.onDismiss?.();
		this.onDismiss = undefined;
		this.onDismissExtra?.();
		this.onDismissExtra = undefined;
	}
}
