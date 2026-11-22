import { Container, type Rectangle } from "pixi.js";

export type Layout = "landscape" | "portrait" | "desktop";

/**
 * Resizable — base class for every PixiJS Container that needs to
 * reposition or rescale itself when the screen size changes.
 *
 * The game runs on many screen sizes and orientations. Instead of
 * hardcoding positions, every visual object extends Resizable and
 * overrides one or more of the three layout methods:
 *
 *   resizeDesktop   — mouse device, any width (monitors, laptops)
 *   resizeLandscape — touch device, wider than tall (phones rotated)
 *   resizePortrait  — touch device, taller than wide (phones upright)
 *
 * Desktop is detected by pointer type (pointer: fine) not screen width,
 * so a desktop browser with DevTools open still uses the desktop layout.
 *
 * When resize() is called on a parent, it automatically propagates to
 * all Resizable children in the scene tree — so calling it on the stage
 * root is enough to update the entire layout in one pass.
 */
export class Resizable<T extends Container = Container> extends Container<T> {
	protected currentLayout: Layout = this.initialLayoutGuess();
	protected lastScreen!: Rectangle;
	protected lastTrueScreen!: Rectangle;
	protected lastDesktop!: boolean;

	/**
	 * Called by CoreController on every resize event.
	 * Selects the correct layout method and propagates to children.
	 *
	 * @param screen      the current renderer dimensions (CSS pixels)
	 * @param desktop     true if the device has a fine pointer (mouse)
	 * @param trueScreen  the real device viewport, before any safe-area adjustments
	 */
	public resize(screen: Rectangle, desktop: boolean, trueScreen: Rectangle): void {
		this.lastScreen = screen;
		this.lastDesktop = desktop;
		this.lastTrueScreen = trueScreen;

		if (desktop) {
			this.currentLayout = "desktop";
			this.resizeDesktop(screen, trueScreen);
		} else if (screen.height >= screen.width) {
			this.currentLayout = "portrait";
			this.resizePortrait(screen, trueScreen);
		} else {
			this.currentLayout = "landscape";
			this.resizeLandscape(screen, trueScreen);
		}

		for (const child of this.children) {
			if (child instanceof Resizable) child.resize(screen, desktop, trueScreen);
		}
	}

	// biome-ignore lint/correctness/noUnusedFunctionParameters: overridden by subclasses
	protected resizeDesktop(_screen: Rectangle, _trueScreen: Rectangle): void {}
	// biome-ignore lint/correctness/noUnusedFunctionParameters: overridden by subclasses
	protected resizePortrait(_screen: Rectangle, _trueScreen: Rectangle): void {}
	// biome-ignore lint/correctness/noUnusedFunctionParameters: overridden by subclasses
	protected resizeLandscape(_screen: Rectangle, _trueScreen: Rectangle): void {}

	/**
	 * Makes an educated guess at the starting layout before the first
	 * resize event fires. Prevents a frame where layout is wrong on boot.
	 */
	private initialLayoutGuess(): Layout {
		if (globalThis.matchMedia?.("(pointer: fine)").matches) return "desktop";
		if (globalThis.screen?.orientation?.type?.startsWith("landscape")) return "landscape";
		return "portrait";
	}
}
