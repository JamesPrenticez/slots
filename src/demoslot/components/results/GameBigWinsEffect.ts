import { Container, Graphics, type Rectangle, Sprite, Text, TextStyle, Texture } from "pixi.js";

import { gravityIn, subtleBounce, Tweener } from "@fanfare/util";

import { BigWinsEffect, type BigWinTier } from "../../../common/components/results/BigWinsEffect";
import { GameBridge } from "../../../engine/GameBridge.js";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

const PLATE_DESIGN_W = DESIGN_W * 0.2;
const TITLE_DESIGN_W = DESIGN_W * 0.3;
const WIN_TEXT_W_RATIO = 1.8;
const WIN_TEXT_REFERENCE = "$888,888.88";

const TITLE_TO_PLATE_GAP_RATIO = -0.35;
const OVERLAY_ALPHA = 0.75;

const ENTER_SCALE = 0.85;
const EXIT_SCALE = 0.85;
const ENTER_TIME = 260;
const EXIT_TIME = 220;
const TIER_TRANSITION_SCALE = 0.8;
const TIER_TRANSITION_TIME = 180;
const GLOW_ROTATION_PER_TIER = 1.5;

export class GameBigWinsEffect extends BigWinsEffect {
	private readonly overlay = new Graphics();
	private readonly glow = Sprite.from("Win_Glow_Tier1.png");
	private readonly plate = Sprite.from("Win_Plate_Tier1.png");
	private readonly title = Sprite.from("Win_Title_Tier1.png");

	// Last known screen rect — needed to re-position on tier art change
	private layoutScreen: Rectangle | undefined;

	private titleBase = { x: 1, y: 1 };
	private winBase = { x: 1, y: 1 };
	private glowBaseRotation = 0;
	private isRevealed = false;

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
			.fill({ color: 0x000000, alpha: OVERLAY_ALPHA });

		this.positionElements();
	}

	private applyTierArt(tier: BigWinTier): void {
		this.glow.texture = Texture.from(`Win_Glow_Tier${tier.assetTier}.png`);
		this.plate.texture = Texture.from(`Win_Plate_Tier${tier.assetTier}.png`);
		this.title.texture = Texture.from(`Win_Title_Tier${tier.assetTier}.png`);

		const plateFit = PLATE_DESIGN_W / this.plate.texture.width;
		this.plate.scale.set(plateFit);

		const glowTex = this.glow.texture;
		const glowCover = Math.max(DESIGN_W / glowTex.width, DESIGN_H / glowTex.height) * 1.4;
		this.glow.scale.set(glowCover);

		const titleFit = TITLE_DESIGN_W / this.title.texture.width;
		this.title.scale.set(titleFit);

		const liveText = this.winText.text;
		this.winText.text = WIN_TEXT_REFERENCE;
		this.winText.scale.set(1);
		const winFit = (this.plate.width * WIN_TEXT_W_RATIO) / this.winText.width;
		this.winText.scale.set(winFit);
		this.winText.text = liveText;

		this.titleBase = { x: this.title.scale.x, y: this.title.scale.y };
		this.winBase = { x: this.winText.scale.x, y: this.winText.scale.y };
		this.glowBaseRotation = this.glow.rotation;

		if (this.layoutScreen) this.positionElements();
	}

	private positionElements(): void {
		const titleToPlateGap = this.title.height * TITLE_TO_PLATE_GAP_RATIO;

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
			this.popTitleIn();
			this.popScaleIn([this.glow, this.plate]);
			this.popScaleIn([this.winText], this.winBase);
		} else {
			void this.transitionToTier(tier);
		}
	}

	private popTitleIn(): void {
		const { x, y } = this.titleBase;
		this.title.scale.set(0);
		this.title.alpha = 0;
		void this.tweenScale(this.title, x * 1.15, y * 1.15, 280, subtleBounce).then(() =>
			this.tweenScale(this.title, x, y, 160)
		);
		void this.tweenAlpha(this.title, 1, 160);
	}

	private popScaleIn(els: Container[], base?: { x: number; y: number }): void {
		for (const el of els) {
			const target = base ?? { x: el.scale.x, y: el.scale.y };
			el.scale.set(target.x * ENTER_SCALE, target.y * ENTER_SCALE);
			void this.tweenScale(el, target.x, target.y, ENTER_TIME);
		}
	}

	private async transitionToTier(tier: BigWinTier): Promise<void> {
		for (const target of [this.plate.scale, this.title.scale, this.title]) Tweener.getInstance().removeTween(target);

		await Promise.all([
			this.tweenScale(
				this.plate,
				this.plate.scale.x * TIER_TRANSITION_SCALE,
				this.plate.scale.y * TIER_TRANSITION_SCALE,
				TIER_TRANSITION_TIME
			),
			this.tweenScale(
				this.title,
				this.title.scale.x * TIER_TRANSITION_SCALE,
				this.title.scale.y * TIER_TRANSITION_SCALE,
				TIER_TRANSITION_TIME
			),
			this.tweenAlpha(this.winText, 0, TIER_TRANSITION_TIME)
		]);

		this.applyTierArt(tier);

		const t = { x: this.plate.scale.x, y: this.plate.scale.y };
		this.plate.scale.set(t.x * TIER_TRANSITION_SCALE, t.y * TIER_TRANSITION_SCALE);
		void this.tweenScale(this.plate, t.x, t.y, TIER_TRANSITION_TIME);
		this.popTitleIn();
		this.winText.alpha = 0;
		void this.tweenAlpha(this.winText, 1, TIER_TRANSITION_TIME);
	}

	protected override onSkip(): void {
		for (const target of [this.title.scale, this.title, this.plate.scale, this.winText])
			Tweener.getInstance().removeTween(target);
		this.glow.rotation = this.glowBaseRotation;
	}

	protected override onCountUpUpdate(value: number, progress: number): void {
		super.onCountUpUpdate(value, progress);
		const pulse = 1 + Math.sin(progress * Math.PI * 6) * 0.03;
		this.winText.scale.set(this.winBase.x * pulse, this.winBase.y * pulse);
		this.glow.rotation = this.glowBaseRotation + progress * GLOW_ROTATION_PER_TIER;
	}

	protected override onTierEnd(): void {
		this.winText.scale.set(this.winBase.x, this.winBase.y);
		this.glow.rotation = this.glowBaseRotation;
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
		const els = [this.overlay, this.glow, this.plate, this.title, this.winText];
		await Promise.all([
			...els.map(el => this.tweenAlpha(el, 0, EXIT_TIME)),
			...[this.glow, this.plate, this.title, this.winText].map(el =>
				this.tweenScale(el, el.scale.x * EXIT_SCALE, el.scale.y * EXIT_SCALE, EXIT_TIME)
			)
		]);
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

	private tweenScale(el: Container, x: number, y: number, time: number, easing = gravityIn) {
		return Tweener.getInstance().addTween(el.scale, { x, y, time, easing });
	}

	private tweenAlpha(el: Container, alpha: number, time: number, easing = gravityIn) {
		return Tweener.getInstance().addTween(el, { alpha, time, easing });
	}
}
