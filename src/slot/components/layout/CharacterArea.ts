import { Rectangle } from "pixi.js";

import { Resizable } from "../../renderer/Resizable.js";

export class CharacterArea extends Resizable {
	public static readonly WIDTH_RATIO = 650 / 1920; // ~33.9 % of screen width
	public static readonly BOTTOM_INSET_RATIO = 220 / 1080; // ~20.4 % of screen height

	public static readonly MIN_WIDTH = 450; // design-space reference only
	public static readonly DESKTOP_BOTTOM_INSET = 220; // design-space reference only

	private static readonly MAX_H_W_RATIO = 1.35;
	private static readonly PORTRAIT_HEIGHT_RATIO = 0.4;
	private static readonly MIN_HEIGHT_PORTRAIT = 150;

	private readonly area = new Rectangle();

	constructor(_gameAspectRatio: number) {
		super();
	}

	public getSafeArea(): Rectangle {
		return this.area.clone();
	}

	public static getPortraitDockHeight(availableHeight: number): number {
		return Math.max(
			Math.max(availableHeight, 0) * CharacterArea.PORTRAIT_HEIGHT_RATIO,
			CharacterArea.MIN_HEIGHT_PORTRAIT
		);
	}

	// ── Portrait-specific constants ───────────────────────────────────────────
	private static readonly PORTRAIT_WIDTH_RATIO = 0.85; // fraction of screen width
	private static readonly PORTRAIT_VISIBLE_RIGHT = 0.5; // 50 % cut off on right
	private static readonly PORTRAIT_VISIBLE_BOTTOM = 0.8; // 20 % cut off on bottom

	protected override resizePortrait(screen: Rectangle, _trueScreen: Rectangle): void {
		const width = screen.width * CharacterArea.PORTRAIT_WIDTH_RATIO;
		const height = Math.min(screen.height * 0.65, width * CharacterArea.MAX_H_W_RATIO);

		this.area.width = width;
		this.area.height = height;
		this.area.x = screen.x + screen.width - width * CharacterArea.PORTRAIT_VISIBLE_RIGHT;
		this.area.y = screen.y + screen.height - height * CharacterArea.PORTRAIT_VISIBLE_BOTTOM;
	}

	private static readonly VISIBLE_RATIO = 0.6; // 40 % cut off on the right
	private static readonly VISIBLE_BOTTOM_RATIO = 0.82; // 18 % cut off on the bottom

	protected override resizeLandscape(screen: Rectangle, trueScreen: Rectangle): void {
		this.resizeDesktop(screen, trueScreen);
	}

	protected override resizeDesktop(screen: Rectangle, _trueScreen: Rectangle): void {
		const width = screen.width * CharacterArea.WIDTH_RATIO;
		const height = Math.min(screen.height, width * CharacterArea.MAX_H_W_RATIO);

		this.area.width = width;
		this.area.height = height;
		// Right: 30 % off-screen
		this.area.x = screen.x + screen.width - width * CharacterArea.VISIBLE_RATIO;
		// Bottom: push down so VISIBLE_BOTTOM_RATIO of height stays on-screen
		this.area.y = screen.y + screen.height - height * CharacterArea.VISIBLE_BOTTOM_RATIO;
	}
}
