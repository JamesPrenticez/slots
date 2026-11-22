/**
 * ControlBar — pixel dimensions of the control interface chrome.
 *
 * Every layout area (GameArea, LogoArea, ScreenSafeArea) subtracts these
 * constants to know how much space is available for game art and reels.
 *
 * LANDSCAPE_WIDTH — width of the side panel on landscape phones that holds
 *   the spin button and bet controls (one panel on each side = 2 × this)
 * HEIGHT          — height of the bottom control bar on desktop/portrait
 */
export class ControlBar {
	public static readonly HEIGHT = 55;
	public static readonly LANDSCAPE_WIDTH = 150;
}
