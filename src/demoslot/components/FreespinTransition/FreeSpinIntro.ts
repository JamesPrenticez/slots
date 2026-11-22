import { Container, Rectangle, Sprite, Texture, Ticker } from "pixi.js";

import { turboDuration } from "../../../common/util/Duration.js";
import { gravityIn, outQuad } from "../../../common/util/Easing.js";
import { makeStyledText } from "../../../common/util/Texthelper.js";
import { Tweener } from "../../../common/util/Tweener.js";
import { Resizable } from "../../../slot/renderer/Resizable.js";
import { Sparkles } from "./Sparkles.js";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

const MODE_TITLES: Record<number, { tier: 1 | 2 | 3 }> = {
	3: { tier: 1 },
	4: { tier: 2 },
	5: { tier: 3 }
};

const GAPS = {
	titleToWon: -140, // title overlaps youWon slightly
	wonToPlate: -130, // YOU WON overlaps the upper portion of the plate
	plateToFreeSpin: -60, // freeSpin sits just below the plate
	freeSpinToButton: 80
};

const STACK_Y_OFFSET = -DESIGN_H * 0.05; // 5 % above centre

const PLATE_DESIGN_W = DESIGN_W * 0.25; // 34 % of 1920 = ~650 px
const TITLE_DESIGN_W = DESIGN_W * 0.5; // 50 % of 1920 = 960 px
const GLOW_ROTATION_SPEED = 0.00015;

const START_SCALE = { title: 0.8, plate: 0, youWon: 0.6, freeSpin: 0.6, count: 0.6, glow: 0.86 };

// ── Class ──────────────────────────────────────────────────────────────────────

export class FreeSpinIntro extends Resizable {
	// Sprites
	private readonly glow = Sprite.from("Glow_Tier1.png");
	private readonly plate = Sprite.from("Plate_Tier1.png");
	private readonly title = Sprite.from("Title_Tier1.png");

	private readonly youWonText = makeStyledText({ content: "YOU WON", size: 100, silverGradient: true, stroke: true });
	private readonly numberText = makeStyledText({ content: "", size: 200, color: 0xffd700, bold: true, stroke: true });
	private readonly freeSpinText = makeStyledText({
		content: "FREE SPINS!",
		size: 100,
		silverGradient: true,
		stroke: true
	});
	private readonly btn = this.makeButton("PRESS TO CONTINUE");
	private readonly sparkles = new Sparkles();

	private targetCount = 0;

	private titleBase = { x: 1, y: 1 };
	private plateBase = { x: 1, y: 1 };
	private glowBase = { x: 1, y: 1 };
	private youWonBase = { x: 1, y: 1 };
	private freeSpinBase = { x: 1, y: 1 };
	private numberBase = { x: 1, y: 1 };

	private introScreen = new Rectangle(0, 0, DESIGN_W, DESIGN_H);
	private dismissAnimationPromise: Promise<void> | undefined;

	private readonly glowRotationTick = (ticker: Ticker): void => {
		this.glow.rotation += GLOW_ROTATION_SPEED * ticker.deltaMS;
	};

	constructor() {
		super();
		for (const s of [this.glow, this.plate, this.title]) s.anchor.set(0.5);
		this.addChild(
			this.glow,
			this.plate,
			this.sparkles,
			this.title,
			this.youWonText,
			this.numberText,
			this.freeSpinText,
			this.btn
		);
	}

	// ── Public API ─────────────────────────────────────────────────────────────

	public setup(count: number, mode: number, onDismiss: () => void): void {
		const tier = (MODE_TITLES[mode] ?? MODE_TITLES[3]).tier;
		this.glow.texture = Texture.from(`Glow_Tier${tier}.png`);
		this.plate.texture = Texture.from(`Plate_Tier${tier}.png`);
		this.title.texture = Texture.from(`Title_Tier${tier}.png`);
		this.targetCount = count;
		this.numberText.text = `${count}`;
		this.dismissAnimationPromise = undefined;

		const glowTex = this.glow.texture;
		const glowCover = Math.max(DESIGN_W / glowTex.width, DESIGN_H / glowTex.height) * 1.4;
		this.glow.scale.set(glowCover);
		this.glowBase = { x: glowCover, y: glowCover };

		const plateFit = PLATE_DESIGN_W / this.plate.texture.width;
		this.plate.scale.set(plateFit);

		const titleFit = TITLE_DESIGN_W / this.title.texture.width;
		this.title.scale.set(titleFit);

		for (const el of [this.youWonText, this.freeSpinText]) el.scale.set(1);

		this.numberText.scale.set(1);
		if (this.numberText.width > this.plate.width) {
			this.numberText.scale.set(this.plate.width / this.numberText.width);
		}

		this.titleBase = { x: this.title.scale.x, y: this.title.scale.y };
		this.plateBase = { x: this.plate.scale.x, y: this.plate.scale.y };
		this.youWonBase = { x: this.youWonText.scale.x, y: this.youWonText.scale.y };
		this.freeSpinBase = { x: this.freeSpinText.scale.x, y: this.freeSpinText.scale.y };
		this.numberBase = { x: this.numberText.scale.x, y: this.numberText.scale.y };

		this.applyScreen(this.introScreen);

		this.btn.removeAllListeners();
		this.btn.on("pointertap", e => {
			e.stopPropagation();
			onDismiss();
		});
		this.resetForReveal();
	}

	public play(): void {
		void this.playIntro();
	}

	public playDismissAnimation(): Promise<void> {
		this.dismissAnimationPromise ??= this.runDismissAnimation();
		return this.dismissAnimationPromise;
	}

	public stop(): void {
		this.sparkles.stop();
		Ticker.shared.remove(this.glowRotationTick);
	}

	// ── Resize — single uniform scale, no per-element math ───────────────────

	protected override resizeDesktop(screen: Rectangle, _t: Rectangle): void {
		this.applyScreen(screen);
	}
	protected override resizeLandscape(screen: Rectangle, _t: Rectangle): void {
		this.applyScreen(screen);
	}
	protected override resizePortrait(screen: Rectangle, _t: Rectangle): void {
		this.applyScreen(screen);
	}

	public layout(cx: number, cy: number, screenWidth: number, screenHeight: number): void {
		this.applyScreen(new Rectangle(cx - screenWidth / 2, cy - screenHeight / 2, screenWidth, screenHeight));
	}

	private applyScreen(screen: Rectangle): void {
		this.introScreen = screen;

		const cx = screen.x + screen.width / 2;
		const cy = screen.y + screen.height / 2;

		const isPortrait = screen.height > screen.width;
		const fit = isPortrait
			? (screen.height / DESIGN_H) * 0.6 // fills the tall dimension
			: screen.width / DESIGN_W; // fills the wide dimension

		this.scale.set(fit);
		this.position.set(cx, cy);
		this.layoutElements();
	}

	private layoutElements(): void {
		this.glow.position.set(0, 0);

		// Vertical stack centred slightly above screen centre
		const rows = [
			{ el: this.title, gapAfter: GAPS.titleToWon },
			{ el: this.youWonText, gapAfter: GAPS.wonToPlate },
			{ el: this.plate, gapAfter: GAPS.plateToFreeSpin, extra: [this.numberText] },
			{ el: this.freeSpinText, gapAfter: GAPS.freeSpinToButton },
			{ el: this.btn, gapAfter: 0 }
		];

		const totalHeight = rows.reduce((s, r) => s + r.el.height + r.gapAfter, 0);

		let y = -totalHeight / 2 + STACK_Y_OFFSET;
		for (const row of rows) {
			y += row.el.height / 2;
			row.el.position.set(0, y);
			for (const extra of row.extra ?? []) extra.position.set(0, y);
			y += row.el.height / 2 + row.gapAfter;
		}

		this.sparkles.position.copyFrom(this.plate.position);
		this.sparkles.setRadius(this.plate.width * 0.55, this.plate.height * 0.55);
	}

	// ── Animations ────────────────────────────────────────────────────────────

	private async playIntro(): Promise<void> {
		this.resetForReveal();
		const titleRestY = this.title.y;
		this.title.y = titleRestY - 40;

		Ticker.shared.remove(this.glowRotationTick);
		Ticker.shared.add(this.glowRotationTick);

		// t=0 — glow fades + scales to full
		void this.tweenAlpha(this.glow, 1, turboDuration(450, 200));
		void this.tweenScale(
			this.glow,
			this.glowBase.x / START_SCALE.glow,
			this.glowBase.y / START_SCALE.glow,
			turboDuration(600, 250),
			outQuad
		);

		// t=120 — plate pops from scale-0
		await this.wait(turboDuration(120, 60));
		void this.tweenAlpha(this.plate, 1, turboDuration(250, 120));
		void this.tweenScale(this.plate, this.plateBase.x, this.plateBase.y, turboDuration(500, 220), outQuad);

		// t=280 — title slides down
		await this.wait(turboDuration(160, 70));
		this.title.alpha = 1;
		void Tweener.getInstance().addTween(this.title.position, {
			y: titleRestY,
			time: turboDuration(400, 180),
			easing: outQuad
		});

		// t=300 — YOU WON pops
		await this.wait(turboDuration(20, 10));
		this.youWonText.alpha = 1;
		void this.tweenScale(this.youWonText, this.youWonBase.x, this.youWonBase.y, turboDuration(400, 180), outQuad);

		// t=400 — count pops + counts up
		await this.wait(turboDuration(100, 50));
		void this.revealNumber();
		this.sparkles.start();

		// t=500 — FREE SPINS pops
		await this.wait(turboDuration(100, 50));
		this.freeSpinText.alpha = 1;
		void this.tweenScale(this.freeSpinText, this.freeSpinBase.x, this.freeSpinBase.y, turboDuration(400, 180), outQuad);

		// Button slides up
		await this.wait(turboDuration(150, 70));
		await this.fadeInButton();
	}

	private async runDismissAnimation(): Promise<void> {
		const STEP = 60;
		const IMPLODE = 340;
		const collapse = [this.freeSpinText, this.youWonText, this.numberText, this.title, this.plate];

		void this.tweenAlpha(this.glow, 0, IMPLODE);
		void this.tweenAlpha(this.sparkles, 0, IMPLODE * 0.5);
		void this.tweenAlpha(this.btn, 0, turboDuration(200, 100));

		await Promise.all(
			collapse.map((el, i) =>
				this.wait(i * STEP).then(() =>
					Promise.all([
						this.tweenAlpha(el, 0, Math.round(IMPLODE * 0.85)),
						this.tweenScale(el, 0, 0, IMPLODE),
						Tweener.getInstance().addTween(el.position, { x: 0, y: 0, time: IMPLODE, easing: outQuad })
					])
				)
			)
		);
	}

	private resetForReveal(): void {
		const gb = this.glowBase;
		this.glow.alpha = 0;
		this.glow.scale.set(gb.x * START_SCALE.glow, gb.y * START_SCALE.glow);

		this.title.alpha = 0;
		this.title.scale.set(this.titleBase.x, this.titleBase.y);

		this.plate.alpha = 0;
		this.plate.scale.set(0, 0);

		this.youWonText.alpha = 0;
		this.youWonText.scale.set(this.youWonBase.x * START_SCALE.youWon, this.youWonBase.y * START_SCALE.youWon);

		this.numberText.alpha = 0;
		this.numberText.text = "0";
		this.numberText.scale.set(this.numberBase.x * START_SCALE.count, this.numberBase.y * START_SCALE.count);

		this.freeSpinText.alpha = 0;
		this.freeSpinText.scale.set(this.freeSpinBase.x * START_SCALE.freeSpin, this.freeSpinBase.y * START_SCALE.freeSpin);

		this.btn.alpha = 0;
		this.sparkles.alpha = 1;
	}

	private async revealNumber(): Promise<void> {
		this.numberText.alpha = 1;
		this.numberText.text = "0";
		this.numberText.scale.set(this.numberBase.x * START_SCALE.count, this.numberBase.y * START_SCALE.count);

		void this.tweenScale(this.numberText, this.numberBase.x, this.numberBase.y, turboDuration(450, 200), outQuad);

		const counter = { v: 0 };
		void Tweener.getInstance()
			.addTween(counter, {
				v: this.targetCount,
				time: turboDuration(700, 350),
				easing: outQuad,
				onUpdate: () => {
					this.numberText.text = String(Math.round(counter.v));
				}
			})
			.then(() => {
				this.numberText.text = String(this.targetCount);
			});
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

	// ── Helpers ───────────────────────────────────────────────────────────────

	private wait(ms: number): Promise<void> {
		return new Promise(r => setTimeout(r, ms));
	}

	private tweenScale(el: Container, x: number, y: number, time: number, easing = gravityIn) {
		return Tweener.getInstance().addTween(el.scale, { x, y, time, easing });
	}

	private tweenAlpha(el: Container, alpha: number, time: number, easing = gravityIn) {
		return Tweener.getInstance().addTween(el, { alpha, time, easing });
	}

	private makeButton(label: string): Container {
		const btn = new Container();
		const txt = makeStyledText({ content: label, size: 45, silverGradient: true, stroke: true });
		txt.anchor.set(0.5);
		btn.addChild(txt);
		btn.interactive = true;
		btn.eventMode = "static";
		btn.cursor = "pointer";
		return btn;
	}
}
