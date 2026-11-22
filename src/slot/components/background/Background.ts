import { ViewStore } from "../../../fanfarebaseslot/ViewStore.js";
import { Resizable } from "../../renderer/Resizable.js";

/**
 * Background — the base class for every game's background layer.
 *
 * Extends Resizable so subclasses automatically receive resize events
 * and can reposition their sprites across all screen sizes and orientations.
 *
 * Registers itself in ViewStore as "Background" so Commands can reach it
 * without importing game-specific classes. For example, a command could
 * call ViewStore.get("Background").hideGameLogo() at the right moment
 * in a bonus sequence — without knowing which game's Background it is.
 *
 * Games subclass this and override the resize methods to position their
 * own background art, logo, and any above-reel decorative elements.
 */
export class Background extends Resizable {
	constructor() {
		super();
		ViewStore.getInstance().set("Background", this);
	}

	/**
	 * Called after the game scene is fully revealed.
	 * Override to hide a splash logo or intro animation once play begins.
	 */
	public hideGameLogo(): void {}

	// Subclasses override these to position their own art:
	// protected override resizeDesktop(screen: Rectangle, trueScreen: Rectangle): void {}
	// protected override resizeLandscape(screen: Rectangle, trueScreen: Rectangle): void {}
	// protected override resizePortrait(screen: Rectangle, trueScreen: Rectangle): void {}
}
