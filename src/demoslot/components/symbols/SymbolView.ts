import { Container, Graphics, Sprite } from "pixi.js";

import type { ReelSymbolView, SymbolWithId } from "../../../slot/renderer/Reel.js";
import { SymbolConverter } from "../../config/SymbolConverter.js";
import { THEME } from "../../config/ThemeConfig.js";

const T = THEME.symbols;

/**
 * SymbolView — one symbol cell on a reel.
 *
 * Keeps the scene tree lean — the highlight Graphics is only created
 * when showHighlight() is called and destroyed when clearHighlight()
 * is called. During normal play (no win presentation) each SymbolView
 * contains only a single Sprite, nothing else.
 */
export class SymbolView extends Container implements ReelSymbolView {
	private readonly sprite: Sprite;
	private highlight: Graphics | null = null;
	public symbolId: string = "";

	constructor(
		sym: SymbolWithId,
		initialY: number,
		private readonly size: number
	) {
		super();
		this.symbolId = sym.id;
		this.sprite = Sprite.from(SymbolConverter.getTexture(sym.id));
		this.sprite.width = size;
		this.sprite.height = size;
		this.sprite.anchor.set(0.5);
		this.addChild(this.sprite);
		this.y = initialY;
	}

	// ── ReelSymbolView interface ───────────────────────────────────────────────

	public updateSymbol(sym: SymbolWithId): void {
		this.symbolId = sym.id;
		this.sprite.texture = Sprite.from(SymbolConverter.getTexture(sym.id)).texture;
		this.clearHighlight();
	}

	public blur(): void {
		this.tint = T.blurTint;
	}
	public unblur(): void {
		this.tint = 0xffffff;
	}

	// ── Win highlight ─────────────────────────────────────────────────────────

	public showHighlight(): void {
		// Create on demand — not allocated until actually needed
		if (!this.highlight) {
			this.highlight = new Graphics();
			this.addChild(this.highlight);
		}

		const { color, fillAlpha, strokeAlpha, strokeWidth, radius, inset } = T.highlight;
		const s = this.size / 2 - inset;
		this.highlight
			.clear()
			.roundRect(-s, -s, s * 2, s * 2, radius)
			.fill({ color, alpha: fillAlpha })
			.setStrokeStyle({ width: strokeWidth, color, alpha: strokeAlpha })
			.roundRect(-s, -s, s * 2, s * 2, radius)
			.stroke();
	}

	public clearHighlight(): void {
		if (!this.highlight) return;
		// Destroy and null — removes from scene tree entirely
		this.removeChild(this.highlight);
		this.highlight.destroy();
		this.highlight = null;
	}
}
