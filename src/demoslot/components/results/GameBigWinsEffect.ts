import { Container, Graphics, type Rectangle, Sprite, Text, TextStyle, Texture } from "pixi.js";

import { BigWinsEffect, type BigWinTier } from "../../../common/components/results/BigWinsEffect";
import { GameBridge } from "../../../engine/GameBridge.js";
import { THEME } from "../../config/ThemeConfig.js";
import { tex } from "../animUtil.js";
import { type BigWinParts, getBigWinAnim } from "./BigWinAnim.js";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

const T = THEME.bigWin;

export class GameBigWinsEffect extends BigWinsEffect {
	private readonly overlay = new Graphics();
	private readonly glow = Sprite.from(tex(T.textures.glow, 1));
	private readonly plate = Sprite.from(tex(T.textures.plate, 1));
	private readonly title = Sprite.from(tex(T.textures.title, 1));

	// Last known screen rect — needed to re-position on tier art change
	private layoutScreen: Rectangle | undefined;

	private titleBase = { x: 1, y: 1 };
	private winBase = { x: 1, y: 1 };
	private glowBaseRotation = 0;
	private isRevealed = false;
	private readonly anim = getBigWinAnim(T.anim);

	private get parts(): BigWinParts {
		return {
			overlay: this.overlay,
			glow: this.glow,
			plate: this.plate,
			title: this.title,
			win: this.winText,
			base: { title: this.titleBase, win: this.winBase },
			glowBaseRotation: this.glowBaseRotation
		};
	}

	constructor() {
		super();
		for (const s of [this.glow, this.plate, this.title]) s.anchor.set(0.5);

		this.tierText = new Text({ text: "" });

		this.winText = new Text({
			text: "",
			style: new TextStyle({
				fontFamily: "Titan One",
				fontSize: 56,
				fontWeight: "700",
				fill: 0xffd700,
				stroke: { color: 0x000000, width: 6 },
				align: "center"
			})
		});
		this.winText.anchor.set(0.5);

		this.addChild(this.overlay, this.glow, this.plate, this.winText, this.title);
		for (const el of [this.overlay, this.glow, this.plate, this.title, this.winText]) el.alpha = 0;
	}

	// ── Resize — single uniform scale ────────────────────────────────────────

	protected override resizeDesktop(screen: Rectangle): void {
		this.applyLayout(screen);
	}
	protected override resizePortrait(screen: Rectangle): void {
		this.applyLayout(screen);
	}
	protected override resizeLandscape(screen: Rectangle): void {
		this.applyLayout(screen);
	}

	private applyLayout(screen: Rectangle): void {
		this.layoutScreen = screen;

		const cx = screen.x + screen.width / 2;
		const cy = screen.y + screen.height / 2;

		const isPortrait = screen.height > screen.width;
		const fit = isPortrait ? (screen.height / DESIGN_H) * 0.5 : screen.width / DESIGN_W;

		this.scale.set(fit);
		this.position.set(cx, cy);

		const localW = screen.width / fit;
		const localH = screen.height / fit;
		this.overlay
			.clear()
			.rect(-localW / 2, -localH / 2, localW, localH)
			.fill({ color: 0x000000, alpha: T.overlayAlpha });

		this.positionElements();
	}

	private applyTierArt(tier: BigWinTier): void {
		this.glow.texture = Texture.from(tex(T.textures.glow, tier.assetTier));
		this.plate.texture = Texture.from(tex(T.textures.plate, tier.assetTier));
		this.title.texture = Texture.from(tex(T.textures.title, tier.assetTier));

		const plateFit = (DESIGN_W * T.plateWidth) / this.plate.texture.width;
		this.plate.scale.set(plateFit);

		const glowTex = this.glow.texture;
		const glowCover = Math.max(DESIGN_W / glowTex.width, DESIGN_H / glowTex.height) * 1.4;
		this.glow.scale.set(glowCover);

		const titleFit = (DESIGN_W * T.titleWidth) / this.title.texture.width;
		this.title.scale.set(titleFit);

		const liveText = this.winText.text;
		this.winText.text = T.winTextReference;
		this.winText.scale.set(1);
		const winFit = (this.plate.width * T.winTextWidthRatio) / this.winText.width;
		this.winText.scale.set(winFit);
		this.winText.text = liveText;

		this.titleBase = { x: this.title.scale.x, y: this.title.scale.y };
		this.winBase = { x: this.winText.scale.x, y: this.winText.scale.y };
		this.glowBaseRotation = this.glow.rotation;

		if (this.layoutScreen) this.positionElements();
	}

	private positionElements(): void {
		const titleToPlateGap = this.title.height * T.titleToPlateGapRatio;

		const rows: { el: Container; gapAfter: number; extra?: Container[] }[] = [
			{ el: this.title, gapAfter: titleToPlateGap },
			{ el: this.plate, gapAfter: 0, extra: [this.glow, this.winText] }
		];

		const totalHeight = rows.reduce((s, r) => s + r.el.height + r.gapAfter, 0);
		let y = -totalHeight / 2;

		for (const row of rows) {
			y += row.el.height / 2;
			row.el.position.set(0, y);
			for (const extra of row.extra ?? []) extra.position.set(0, y);
			y += row.el.height / 2 + row.gapAfter;
		}
	}

	protected override onTierStart(tier: BigWinTier): void {
		if (!this.isRevealed) {
			this.isRevealed = true;

			// Hide HUD for the duration of the big win sequence
			GameBridge.getInstance().setHudVisible(false);

			for (const el of [this.overlay, this.glow, this.plate, this.winText]) el.alpha = 1;
			this.applyTierArt(tier);
			this.anim.enter(this.parts);
		} else {
			void this.transitionToTier(tier);
		}
	}

	private async transitionToTier(tier: BigWinTier): Promise<void> {
		await this.anim.tierOut(this.parts);
		this.applyTierArt(tier);
		this.anim.tierIn(this.parts);
	}

	protected override onSkip(): void {
		this.anim.onSkip(this.parts);
	}

	protected override onCountUpUpdate(value: number, progress: number): void {
		super.onCountUpUpdate(value, progress);
		this.anim.onCountUp(this.parts, progress);
	}

	protected override onTierEnd(): void {
		this.anim.onTierEnd(this.parts);
	}

	public override hide(): void {
		super.hide();
		if (!this.isRevealed) {
			this.resetVisuals();
			return;
		}
		this.isRevealed = false;
		void this.playExit();
	}

	private async playExit(): Promise<void> {
		await this.anim.exit(this.parts);
		this.resetVisuals();
	}

	private resetVisuals(): void {
		this.winText.text = "";
		for (const el of [this.overlay, this.glow, this.plate, this.title, this.winText]) el.alpha = 0;
		this.glow.rotation = 0;
		this.glowBaseRotation = 0;

		// Restore HUD now that the big win sequence is fully complete
		GameBridge.getInstance().setHudVisible(true);
	}
}
