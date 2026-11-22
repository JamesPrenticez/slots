import { Rectangle } from "pixi.js";

import { Resizable } from "../../renderer/Resizable.js";
import { ControlBar } from "./ControlBar.js";
import { GameInfoBar } from "./GameInfoBar.js";

/**
 * LogoArea — where the game logo lives.
 *
 * Landscape/desktop: a compact badge in the TOP-LEFT corner — not a
 * full-height column. The column was reserving width the reel tray
 * needed for no real benefit (the logo graphic itself is small); the
 * badge only costs a small top inset, freeing that width back to
 * GameArea/CharacterArea entirely. getBadgeTopInset() is shared with both
 * so they size the tray's height budget consistently with where the
 * badge actually sits.
 *
 * Portrait is unchanged.
 */
export class LogoArea extends Resizable {
	public static readonly MIN_HEIGHT_LANDSCAPE = 150;
	public static readonly MIN_HEIGHT_PORTRAIT = 100;
	public static readonly PORTRAIT_LOGO_RATIO = 0.12;

	/** Compact top-left badge size in landscape/desktop. */
	public static readonly BADGE_WIDTH = 260;
	public static readonly BADGE_HEIGHT = 110;
	public static readonly BADGE_MARGIN = 20;

	private readonly area = new Rectangle();

	constructor(_gameAspectRatio: number) {
		super();
	}

	public getSafeArea(): Rectangle {
		return this.area.clone();
	}

	/** Total vertical space the badge (plus its margin) claims at the top — shared with GameArea/CharacterArea so their height budgets stay consistent with where the badge is actually drawn. */
	public static getBadgeTopInset(): number {
		return LogoArea.BADGE_MARGIN + LogoArea.BADGE_HEIGHT;
	}

	private layoutBadge(screen: Rectangle, leftChromeInset: number): void {
		const maxWidth = Math.max(screen.width - leftChromeInset, 0) * 0.4;

		this.area.x = screen.x + leftChromeInset + LogoArea.BADGE_MARGIN;
		this.area.y = screen.y + GameInfoBar.HEIGHT + LogoArea.BADGE_MARGIN;
		this.area.width = Math.min(LogoArea.BADGE_WIDTH, maxWidth);
		this.area.height = LogoArea.BADGE_HEIGHT;
	}

	protected override resizeLandscape(screen: Rectangle, _trueScreen: Rectangle): void {
		this.layoutBadge(screen, 0);
	}

	protected override resizePortrait(screen: Rectangle, _trueScreen: Rectangle): void {
		const available = screen.height - GameInfoBar.HEIGHT - ControlBar.HEIGHT;

		this.area.x = screen.x;
		this.area.y = screen.y + GameInfoBar.HEIGHT;
		this.area.width = screen.width;
		this.area.height = Math.max(available * LogoArea.PORTRAIT_LOGO_RATIO, LogoArea.MIN_HEIGHT_PORTRAIT);
	}

	protected override resizeDesktop(screen: Rectangle, trueScreen: Rectangle): void {
		if (screen.height > screen.width) {
			this.resizePortrait(screen, trueScreen);
			return;
		}
		this.layoutBadge(screen, 0);
	}
}
