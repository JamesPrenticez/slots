import { Rectangle } from "pixi.js";

import { Resizable } from "../../renderer/Resizable.js";
import { ControlBar } from "./ControlBar.js";
import { GameInfoBar } from "./GameInfoBar.js";

/**
 * ScreenSafeArea — the full drawable rectangle after subtracting UI chrome.
 *
 * Covers everything visible to the player except the control bars and
 * top info strip. Background art should fill this area. Logo and game
 * decorations position themselves relative to it.
 *
 * This is the largest available area. GameArea is a sub-region of this
 * that excludes the logo strip — the SlotMachine fits inside GameArea.
 */
export class ScreenSafeArea extends Resizable {
	private readonly area = new Rectangle();

	/** Returns a clone of the current safe area rectangle */
	public getSafeArea(): Rectangle {
		return this.area.clone();
	}

	protected override resizeLandscape(screen: Rectangle, _trueScreen: Rectangle): void {
		// In landscape: control bars run down each side, control row at bottom
		this.area.x = screen.x + ControlBar.LANDSCAPE_WIDTH;
		this.area.y = screen.y;
		this.area.width = screen.width - ControlBar.LANDSCAPE_WIDTH * 2;
		this.area.height = screen.height - GameInfoBar.HEIGHT - ControlBar.HEIGHT;
	}

	protected override resizePortrait(screen: Rectangle, _trueScreen: Rectangle): void {
		// In portrait: full width, subtract top info bar + bottom controls
		this.area.x = screen.x;
		this.area.y = screen.y;
		this.area.width = screen.width;
		this.area.height = screen.height - GameInfoBar.HEIGHT - ControlBar.HEIGHT;
	}

	protected override resizeDesktop(screen: Rectangle, _trueScreen: Rectangle): void {
		// Desktop mirrors landscape with no side panel reduction
		this.area.x = screen.x;
		this.area.y = screen.y;
		this.area.width = screen.width;
		this.area.height = screen.height - GameInfoBar.HEIGHT - ControlBar.HEIGHT;
	}
}
