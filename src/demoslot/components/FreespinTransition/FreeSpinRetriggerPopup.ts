import { Container, Graphics, Rectangle, Sprite, Text, Ticker } from "pixi.js";

import { turboDuration } from "../../../common/util/Duration.js";
import { gravityIn, outQuad } from "../../../common/util/Easing.js";
import { makeStyledText } from "../../../common/util/Texthelper.js";
import { Tweener } from "../../../common/util/Tweener.js";
import { Resizable } from "../../../slot/renderer/Resizable.js";
import { Sparkles } from "./Sparkles.js";

const OVERLAY_ALPHA = 0.75;
const GAPS = {
	titleToWon: -20,
	wonToNumber: -60,
	numberToFreeSpin: -60,
	freeSpinToButton: 90
};

const VERTICAL_OFFSET_RATIO = 0.08;
const POP_TIME = 300;
const STAGGER_MS = 130;
const NUMBER_BOUNCE_SCALE = 0.95;
const START_SCALE = { title: 0.8, youWon: 0.8, freeSpin: 0.8 };
const GLOW_ROTATION_SPEED = 0.00015;
const MAX_FIT_SCALE = 1;
const FIT_MARGIN = 0.9;

const UPGRADE_LABELS: Record<number, string> = {
	4: "UPGRADED TO MAIN COURSE",
	5: "UPGRADED TO FINAL FEAST"
};

export class FreeSpinRetriggerPopup extends Resizable {
	private readonly overlay = new Graphics();
	private readonly glow = Sprite.from("Glow_Tier2.png");
	private readonly title = Sprite.from("Title_Retrigger.png");
	private readonly youWonText = makeStyledText({
		content: "YOU WON!",
		size: 120,
		silverGradient: true,
		stroke: true
	});
	private readonly numberText = makeStyledText({ content: "", size: 300, color: 0xffd700, bold: true, stroke: true });
	private readonly freeSpinText = makeStyledText({
		content: "FREE SPINS!",
		size: 120,
		silverGradient: true,
		stroke: true
	});
	private readonly upgradeText = makeStyledText({
		content: "",
		size: 70,
		color: 0xffd700,
		silverGradient: true,
		stroke: true
	});
	private readonly btn = this.makeButton("PRESS TO CONTINUE");
	private readonly sparkles = new Sparkles();

	private lastCx = 0;
	private lastCy = 0;
	private lastScreenWidth = 800;
	private lastScreenHeight = 600;
	private targetCount = 0;

	private titleBase = { x: 1, y: 1 };
	private glowBase = { x: 1, y: 1 };
	private youWonBase = { x: 1, y: 1 };
	private freeSpinBase = { x: 1, y: 1 };
	private numberBase = { x: 1, y: 1 };
	private upgradeBase = { x: 1, y: 1 };

	private readonly glowRotationTick = (ticker: Ticker): void => {
		this.glow.rotation += GLOW_ROTATION_SPEED * ticker.deltaMS;
	};

	constructor() {
		super();
		for (const s of [this.glow, this.title]) s.anchor.set(0.5);

		this.addChild(
			this.overlay,
			this.glow,
			this.sparkles,
			this.title,
			this.youWonText,
			this.numberText,
			this.freeSpinText,
			this.upgradeText,
			this.btn
		);
	}

	public setup(count: number, onDismiss: () => void, modeUpgradeTo?: number): void {
		this.targetCount = count;
		this.numberText.text = `${count}`;
		this.upgradeText.text = modeUpgradeTo ? (UPGRADE_LABELS[modeUpgradeTo] ?? "") : "";
		this.upgradeText.visible = !!this.upgradeText.text;

		this.layout(this.lastCx, this.lastCy, this.lastScreenWidth, this.lastScreenHeight);

		this.btn.removeAllListeners();
		this.btn.on("pointertap", e => {
			e.stopPropagation();
			onDismiss();
		});

		this.playIntro();
	}

	public stop(): void {
		this.sparkles.stop();
		Ticker.shared.remove(this.glowRotationTick);
	}

	protected override resizeLandscape(screen: Rectangle, _trueScreen: Rectangle): void {
		this.applyScreen(screen);
	}
	protected override resizePortrait(screen: Rectangle, _trueScreen: Rectangle): void {
		this.applyScreen(screen);
	}
	protected override resizeDesktop(screen: Rectangle, _trueScreen: Rectangle): void {
		this.applyScreen(screen);
	}

	private applyScreen(screen: Rectangle): void {
		this.layout(screen.x + screen.width / 2, screen.y + screen.height / 2, screen.width, screen.height);
	}

	private async playIntro(): Promise<void> {
		this.resetForReveal();

		Ticker.shared.remove(this.glowRotationTick);
		Ticker.shared.add(this.glowRotationTick);

		void this.tweenScale(this.title, this.titleBase.x, this.titleBase.y, turboDuration(POP_TIME, 120), outQuad);
		void this.tweenAlpha(this.glow, 1, turboDuration(400, 150));

		const stagger = () => this.wait(turboDuration(STAGGER_MS, 40));
		await stagger();

		void this.popIn(this.youWonText, this.youWonBase);
		await stagger();

		void this.revealNumber();
		this.sparkles.start();
		await stagger();

		await this.popIn(this.freeSpinText, this.freeSpinBase);
		if (this.upgradeText.visible) {
			await this.popIn(this.upgradeText, this.upgradeBase);
		}
		await this.fadeInButton();
	}

	private resetForReveal(): void {
		this.title.alpha = 1;
		this.title.scale.set(this.titleBase.x * START_SCALE.title, this.titleBase.y * START_SCALE.title);

		this.glow.alpha = 0;
		this.glow.scale.set(this.glowBase.x, this.glowBase.y);

		this.youWonText.alpha = 0;
		this.youWonText.scale.set(this.youWonBase.x * START_SCALE.youWon, this.youWonBase.y * START_SCALE.youWon);

		this.numberText.alpha = 0;
		this.numberText.scale.set(this.numberBase.x, this.numberBase.y);

		this.freeSpinText.alpha = 0;
		this.freeSpinText.scale.set(this.freeSpinBase.x * START_SCALE.freeSpin, this.freeSpinBase.y * START_SCALE.freeSpin);

		if (this.upgradeText.visible) {
			this.upgradeText.alpha = 0;
			this.upgradeText.scale.set(this.upgradeBase.x, this.upgradeBase.y);
		}

		this.btn.alpha = 0;
	}

	private popIn(el: Container, base: { x: number; y: number }): Promise<boolean> {
		el.alpha = 1;
		return this.tweenScale(el, base.x, base.y, turboDuration(POP_TIME, 120));
	}

	private async revealNumber(): Promise<void> {
		this.numberText.alpha = 1;
		this.numberText.text = `${this.targetCount}`;
		this.numberText.scale.set(this.numberBase.x, this.numberBase.y);

		await this.tweenScale(
			this.numberText,
			this.numberBase.x * NUMBER_BOUNCE_SCALE,
			this.numberBase.y * NUMBER_BOUNCE_SCALE,
			turboDuration(120, 60)
		).then(() => this.tweenScale(this.numberText, this.numberBase.x, this.numberBase.y, turboDuration(160, 60)));
	}

	private async fadeInButton(): Promise<void> {
		const targetY = this.btn.y;
		this.btn.y += 15;
		await Tweener.getInstance().addTween(this.btn, {
			alpha: 1,
			y: targetY,
			time: turboDuration(380, 300),
			easing: gravityIn
		});
	}

	private wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	public layout(cx: number, cy: number, screenWidth: number, screenHeight: number): void {
		this.lastCx = cx;
		this.lastCy = cy;
		this.lastScreenWidth = screenWidth;
		this.lastScreenHeight = screenHeight;

		for (const el of [this.glow, this.title, this.youWonText, this.numberText, this.freeSpinText, this.upgradeText]) {
			el.scale.set(1);
		}

		const rows: { el: Text | Sprite | Container; gapAfter: number; extra?: Container[] }[] = [
			{ el: this.title, gapAfter: GAPS.titleToWon },
			{ el: this.youWonText, gapAfter: GAPS.wonToNumber },
			{ el: this.numberText, gapAfter: GAPS.numberToFreeSpin, extra: [this.glow, this.sparkles] },
			{ el: this.freeSpinText, gapAfter: this.upgradeText.visible ? 20 : GAPS.freeSpinToButton },
			...(this.upgradeText.visible ? [{ el: this.upgradeText, gapAfter: GAPS.freeSpinToButton - 20 }] : []),
			{ el: this.btn, gapAfter: 0 }
		];

		const totalHeight = rows.reduce((sum, row) => sum + row.el.height + row.gapAfter, 0);
		const totalWidth = Math.max(
			this.glow.width,
			this.title.width,
			this.youWonText.width,
			this.numberText.width,
			this.freeSpinText.width,
			this.upgradeText.visible ? this.upgradeText.width : 0,
			this.btn.width
		);

		const fit = Math.min(
			MAX_FIT_SCALE,
			(screenWidth * FIT_MARGIN) / totalWidth,
			(screenHeight * FIT_MARGIN) / totalHeight
		);
		this.scale.set(fit);
		this.position.set(cx, cy);

		const localW = screenWidth / fit;
		const localH = screenHeight / fit;
		this.overlay
			.clear()
			.rect(-localW / 2, -localH / 2, localW, localH)
			.fill({ color: 0x000000, alpha: OVERLAY_ALPHA });

		const base = (el: Sprite | Text) => ({ x: el.scale.x, y: el.scale.y });
		this.titleBase = base(this.title);
		this.glowBase = base(this.glow);
		this.youWonBase = base(this.youWonText);
		this.freeSpinBase = base(this.freeSpinText);
		this.numberBase = base(this.numberText);
		this.upgradeBase = base(this.upgradeText);

		let y = -totalHeight / 2 - (screenHeight * VERTICAL_OFFSET_RATIO) / fit;

		for (const row of rows) {
			y += row.el.height / 2;
			row.el.position.set(0, y);
			for (const extraEl of row.extra ?? []) extraEl.position.set(0, y);
			y += row.el.height / 2 + row.gapAfter;
		}

		this.sparkles.setRadius(this.numberText.width * 0.55, this.numberText.height * 0.55);
	}

	private tweenScale(el: Container, x: number, y: number, time: number, easing = gravityIn) {
		return Tweener.getInstance().addTween(el.scale, { x, y, time, easing });
	}

	private tweenAlpha(el: Container, alpha: number, time: number, easing = gravityIn) {
		return Tweener.getInstance().addTween(el, { alpha, time, easing });
	}

	private makeButton(label: string): Container {
		const btn = new Container();
		const txt = makeStyledText({ content: label, size: 30, silverGradient: true, stroke: true });
		txt.anchor.set(0.5);
		btn.addChild(txt);
		btn.interactive = true;
		btn.eventMode = "static";
		btn.cursor = "pointer";
		return btn;
	}
}
