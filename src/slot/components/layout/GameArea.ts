import { Rectangle } from "pixi.js";

import { Resizable } from "../../renderer/Resizable.js";
import { CharacterArea } from "./CharacterArea.js";
import { ControlBar } from "./ControlBar.js";
import { GameInfoBar } from "./GameInfoBar.js";
import { LogoArea } from "./LogoArea.js";

export class GameArea extends Resizable {
	private static readonly MIN_WIDTH = 200;
	private static readonly MIN_HEIGHT = 150;

	private readonly aspectRatio: number;
	private readonly area = new Rectangle();

	constructor(gameAspectRatio: number) {
		super();
		this.aspectRatio = gameAspectRatio;
	}

	public getSafeArea(): Rectangle {
		return this.area.clone();
	}

	protected override resizePortrait(screen: Rectangle, trueScreen: Rectangle): void {
		// Only use portrait layout when the screen is meaningfully taller than wide.
		// Nearly-square screens (e.g. 675×682) look far better with the desktop layout —
		// the portrait slot-machine-full-width approach produces distorted reels there.
		if (screen.height < screen.width * 1.3) {
			this.resizeDesktop(screen, trueScreen);
			return;
		}

		const available = screen.height - GameInfoBar.HEIGHT - ControlBar.HEIGHT;
		const logoHeight = Math.max(available * LogoArea.PORTRAIT_LOGO_RATIO, LogoArea.MIN_HEIGHT_PORTRAIT);
		const characterHeight = CharacterArea.getPortraitDockHeight(available);

		this.area.x = screen.x;
		this.area.y = screen.y + GameInfoBar.HEIGHT + logoHeight;
		this.area.width = screen.width;
		this.area.height = Math.max(available - logoHeight - characterHeight, GameArea.MIN_HEIGHT);
	}

	protected override resizeLandscape(screen: Rectangle, trueScreen: Rectangle): void {
		this.resizeDesktop(screen, trueScreen); // same layout as desktop
	}

	protected override resizeDesktop(screen: Rectangle, _trueScreen: Rectangle): void {
		const topInset = GameInfoBar.HEIGHT;
		const bottomInset = screen.height * 0.08; // small breathing room at the bottom

		const availH = Math.max(screen.height - topInset - bottomInset, 0);

		// Slot machine is sized purely by the available height × its aspect ratio.
		// The character is NOT factored in here — it overlaps the reels from the
		// right, which is the standard slot-game look. Adjust slotMachineScale in
		// CoreController to control how much of this area the reels actually fill.
		const idealTrayW = availH * this.aspectRatio;
		const trayW = Math.max(
			Math.min(idealTrayW, screen.width * 0.9), // never wider than 90% of screen
			GameArea.MIN_WIDTH
		);

		this.area.x = screen.x + (screen.width - trayW) / 2;
		this.area.y = screen.y + topInset;
		this.area.width = trayW;
		this.area.height = Math.max(availH, GameArea.MIN_HEIGHT);
	}
}
