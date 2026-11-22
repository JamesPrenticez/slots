import { Container, type FederatedPointerEvent, Graphics, type Rectangle, Text, Ticker } from "pixi.js";

import { Resizable } from "../renderer/Resizable.js";

/**
 * DismissableScreen — base class for any full-screen overlay that the
 * player can dismiss by tapping the screen or pressing a button.
 *
 * Used by:
 *   SplashScreen     — tap anywhere or press "Continue" to start the game
 *   FreeSpinIntro    — tap anywhere or press "Start" to begin free spins
 *   FreeSpinOutro    — tap anywhere or press "Collect" to see total win
 *
 * How it works:
 *   1. The screen covers the stage and captures pointer events
 *   2. A tap anywhere on the overlay calls dismiss()
 *   3. Subclasses can add a button via addDismissButton() which also
 *      calls dismiss() when clicked
 *   4. dismiss() fades out then calls onDismissed()
 *   5. Subclasses override onDismissed() to run their own logic after
 *      the screen disappears (e.g. start free spins, show win total)
 *
 * Subclass example:
 *
 *   export class FreeSpinIntro extends DismissableScreen {
 *     constructor() {
 *       super();
 *       this.addDismissButton("START FREE SPINS");
 *     }
 *     protected override onDismissed(): void {
 *       // start free spins here
 *     }
 *   }
 */
export abstract class DismissableScreen extends Resizable {
	private readonly overlay: Graphics;
	private dismissed = false;

	protected constructor(private readonly fadeMs = 400) {
		super();

		// Container must be "static" so PixiJS propagates pointer events
		// from children up through this container to the stage.
		this.eventMode = "static";

		// The overlay is the actual hit area — covers the full screen.
		// alpha 0.001 instead of 0 because fully transparent Graphics
		// receives no pointer events in PixiJS v8.
		this.overlay = new Graphics();
		this.overlay.eventMode = "static";
		this.overlay.cursor = "pointer";
		this.overlay.on("pointertap", () => this.dismiss());

		this.addChild(this.overlay);
	}

	// ── Layout ────────────────────────────────────────────────────────────────

	protected override resizeDesktop(screen: Rectangle, _trueScreen: Rectangle): void {
		this.resizeOverlay(screen);
	}
	protected override resizeLandscape(screen: Rectangle, _trueScreen: Rectangle): void {
		this.resizeOverlay(screen);
	}
	protected override resizePortrait(screen: Rectangle, _trueScreen: Rectangle): void {
		this.resizeOverlay(screen);
	}

	private resizeOverlay(screen: Rectangle): void {
		this.overlay.clear().rect(screen.x, screen.y, screen.width, screen.height).fill({ color: 0x000000, alpha: 0.4 });
	}

	// ── Button factory ────────────────────────────────────────────────────────

	/**
	 * Creates a styled dismiss button and adds it to this screen.
	 * Returns the container so subclasses can reposition it.
	 */
	protected addDismissButton(label: string, width = 0, height = 0): Container {
		const button = new Container();
		button.eventMode = "static";
		button.cursor = "pointer";

		const bg = new Graphics()
			.roundRect(-width / 2, -height / 2, width, height, height / 2)
			.fill({ color: 0xffd700 })
			.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.6 })
			.roundRect(-width / 2, -height / 2, width, height, height / 2)
			.stroke();

		const text = new Text({
			text: label,
			style: { fontSize: 20, fill: 0x000000, fontWeight: "bold", align: "center" }
		});
		text.anchor.set(0.5);

		button.addChild(bg, text);
		button.position.set(500);

		button.on("pointerover", () => {
			button.scale.set(1.05);
		});
		button.on("pointerout", () => {
			button.scale.set(1.0);
		});
		button.on("pointerdown", () => {
			button.scale.set(0.97);
		});
		button.on("pointertap", (e: FederatedPointerEvent) => {
			e.stopPropagation();
			this.dismiss();
		});

		this.addChild(button);
		return button;
	}

	// ── Dismiss ───────────────────────────────────────────────────────────────

	/**
	 * Fades the screen out and removes it from the stage.
	 * Safe to call multiple times — only the first call does anything.
	 */
	public dismiss(): void {
		if (this.dismissed) return;
		this.dismissed = true;

		this.overlay.eventMode = "none";
		this.eventMode = "none";

		// Fade using Ticker.shared directly — avoids Tweener's generic type
		// inference issue with "this" inside an abstract class method.
		const startAlpha = this.alpha;
		const startTime = performance.now();

		const tick = () => {
			const progress = Math.min((performance.now() - startTime) / this.fadeMs, 1);
			this.alpha = startAlpha * (1 - progress);

			if (progress >= 1) {
				Ticker.shared.remove(tick);
				this.parent?.removeChild(this);
				this.onDismissed();
			}
		};

		Ticker.shared.add(tick);
	}

	/**
	 * Called after fade-out completes and screen is removed from stage.
	 * Override to trigger the next game step.
	 */
	protected onDismissed(): void {}
}
