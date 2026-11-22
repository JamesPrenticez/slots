import { Container, Rectangle, Sprite, Text, Ticker } from "pixi.js";

import { turboDuration } from "../../../common/util/Duration.js";
import { gravityIn, outQuad } from "../../../common/util/Easing.js";
import { makeStyledText } from "../../../common/util/Texthelper.js";
import { Tweener } from "../../../common/util/Tweener.js";
import { Resizable } from "../../../slot/renderer/Resizable.js";
import { Sparkles } from "./Sparkles.js";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

const PLATE_DESIGN_W = DESIGN_W * 0.25; // 30 % of 1920 = 576 px
const TITLE_DESIGN_W = DESIGN_W * 0.48; // 48 % of 1920 = 922 px
const FORK_DESIGN_W = DESIGN_W * 0.42; // fork handles poke past plate edges

// Stack geometry
const TITLE_TO_PLATE_GAP = -40;
const PLATE_TO_BUTTON_GAP = 110;
const STACK_Y_OFFSET = -DESIGN_H * 0.03; // slight upward shift

const GLOW_ROTATION_SPEED = 0.0004;
const POP_TIME = 300;
const START_SCALE = 0.85;

export class FreeSpinOutro extends Resizable {
	private readonly glow = Sprite.from("Glow_TotalWin.png");
	private readonly plate = Sprite.from("Plate_TotalWin.png");
	private readonly fork = Sprite.from("Plate_Cutlery.png");
	private readonly title = Sprite.from("Title_TotalWin.png");
	private readonly totalText: Text;
	private readonly subtitleText: Text;
	private readonly btn: Container;
	private readonly sparkles = new Sparkles();

	private titleBase = { x: 1, y: 1 };
	private plateBase = { x: 1, y: 1 };
	private glowBase = { x: 1, y: 1 };
	private cutleryScale = 1;
	private totalBase = { x: 1, y: 1 };
	private subtitleBase = { x: 1, y: 1 };

	private outroScreen = new Rectangle(0, 0, DESIGN_W, DESIGN_H);

	private readonly glowRotationTick = (ticker: Ticker): void => {
		this.glow.rotation += GLOW_ROTATION_SPEED * ticker.deltaMS;
	};

	constructor() {
		super();
		for (const s of [this.glow, this.plate, this.fork, this.title]) s.anchor.set(0.5);

		this.totalText = makeStyledText({ content: "", size: 100, color: 0xffd700, bold: true, stroke: true });
		this.subtitleText = makeStyledText({ content: "", size: 62, silverGradient: true, bold: true, stroke: true });
		this.btn = this.makeButton("PRESS TO CONTINUE");

		this.addChild(
			this.glow,
			this.fork,
			this.plate,
			this.totalText,
			this.subtitleText,
			this.sparkles,
			this.title,
			this.btn
		);
	}

	// ── Public API ─────────────────────────────────────────────────────────────

	public setup(totalWin: number, freeSpinsPlayed: number, onDismiss: () => void): void {
		this.totalText.text = `$${(totalWin / 100).toFixed(2)}`;
		this.subtitleText.text = `${freeSpinsPlayed} FREE SPINS!`;

		const glowTex = this.glow.texture;
		const glowCover = Math.max(DESIGN_W / glowTex.width, DESIGN_H / glowTex.height) * 1.4;
		this.glow.scale.set(glowCover);
		this.glowBase = { x: glowCover, y: glowCover };

		const plateFit = PLATE_DESIGN_W / this.plate.texture.width;
		this.plate.scale.set(plateFit);
		this.plateBase = { x: plateFit, y: plateFit };

		const titleFit = TITLE_DESIGN_W / this.title.texture.width;
		this.title.scale.set(titleFit);
		this.titleBase = { x: titleFit, y: titleFit };

		this.fork.scale.set(1);
		this.cutleryScale = FORK_DESIGN_W / this.fork.width;
		this.fork.scale.set(this.cutleryScale);

		for (const el of [this.totalText, this.subtitleText]) el.scale.set(1);
		this.totalBase = { x: 1, y: 1 };
		this.subtitleBase = { x: 1, y: 1 };

		this.applyScreen(this.outroScreen);

		this.btn.removeAllListeners();
		this.btn.on("pointertap", e => {
			e.stopPropagation();
			onDismiss();
		});
		this.playReveal();
	}

	public stop(): void {
		this.sparkles.stop();
		Ticker.shared.remove(this.glowRotationTick);
	}

	// ── Resize — single uniform scale, positions only in layout ──────────────

	protected override resizeLandscape(screen: Rectangle, _t: Rectangle): void {
		this.applyScreen(screen);
	}
	protected override resizePortrait(screen: Rectangle, _t: Rectangle): void {
		this.applyScreen(screen);
	}
	protected override resizeDesktop(screen: Rectangle, _t: Rectangle): void {
		this.applyScreen(screen);
	}

	public layout(cx: number, cy: number, screenWidth: number, screenHeight: number): void {
		this.applyScreen(new Rectangle(cx - screenWidth / 2, cy - screenHeight / 2, screenWidth, screenHeight));
	}

	private applyScreen(screen: Rectangle): void {
		this.outroScreen = screen;
		const cx = screen.x + screen.width / 2;
		const cy = screen.y + screen.height / 2;

		const isPortrait = screen.height > screen.width;
		const fit = isPortrait
			? (screen.height / DESIGN_H) * 0.5 // fills the tall dimension
			: screen.width / DESIGN_W; // fills the wide dimension
		this.scale.set(fit);
		this.position.set(cx, cy);
		this.layoutPositions();
	}

	// ── Positions only — no scale changes ────────────────────────────────────

	private layoutPositions(): void {
		// Glow always centred
		this.glow.position.set(0, 0);

		const rows = [
			{ el: this.title, gapAfter: TITLE_TO_PLATE_GAP },
			{
				el: this.plate,
				gapAfter: PLATE_TO_BUTTON_GAP,
				extra: [this.fork, this.totalText, this.subtitleText, this.sparkles]
			},
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

		// Subtitle sits a bit below plate centre
		this.subtitleText.position.y = this.plate.y + this.plate.height * 0.22;

		this.sparkles.position.copyFrom(this.plate.position);
		this.sparkles.setRadius(this.plate.width * 0.6, this.plate.height * 0.6);
	}

	// ── Animations ────────────────────────────────────────────────────────────

	private async playReveal(): Promise<void> {
		this.resetForReveal();
		Ticker.shared.remove(this.glowRotationTick);
		Ticker.shared.add(this.glowRotationTick);

		void this.fadeAndScaleIn(this.title, this.titleBase, turboDuration(POP_TIME, 120), outQuad);
		void this.tweenAlpha(this.glow, 1, turboDuration(400, 150));

		await this.wait(turboDuration(130, 40));

		void this.fadeAndScaleIn(this.plate, this.plateBase);
		void this.fadeAndScaleIn(this.fork, { x: this.cutleryScale, y: this.cutleryScale });

		await this.wait(turboDuration(130, 40));

		this.totalText.alpha = 1;
		this.totalText.scale.set(this.totalBase.x, this.totalBase.y);
		void this.popBounce(this.totalText, this.totalBase);

		this.subtitleText.alpha = 1;
		void this.tweenScale(this.subtitleText, this.subtitleBase.x, this.subtitleBase.y, turboDuration(POP_TIME, 120));

		this.sparkles.start();
		await this.fadeInButton();
	}

	private resetForReveal(): void {
		this.title.alpha = 0;
		this.title.scale.set(this.titleBase.x * START_SCALE, this.titleBase.y * START_SCALE);

		this.plate.alpha = 0;
		this.plate.scale.set(this.plateBase.x * START_SCALE, this.plateBase.y * START_SCALE);

		this.glow.alpha = 0;
		this.glow.scale.set(this.glowBase.x * 0.86, this.glowBase.y * 0.86);

		this.fork.alpha = 0;
		this.fork.scale.set(this.cutleryScale * START_SCALE, this.cutleryScale * START_SCALE);

		this.totalText.alpha = 0;
		this.totalText.scale.set(this.totalBase.x, this.totalBase.y);

		this.subtitleText.alpha = 0;
		this.subtitleText.scale.set(this.subtitleBase.x * START_SCALE, this.subtitleBase.y * START_SCALE);

		this.btn.alpha = 0;
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	private async popBounce(el: Container, base: { x: number; y: number }): Promise<void> {
		await this.tweenScale(el, base.x * 0.95, base.y * 0.95, turboDuration(120, 60)).then(() =>
			this.tweenScale(el, base.x, base.y, turboDuration(160, 60))
		);
	}

	private async fadeAndScaleIn(
		el: Sprite,
		target: { x: number; y: number },
		time = turboDuration(POP_TIME, 120),
		easing = gravityIn
	): Promise<void> {
		await Promise.all([this.tweenAlpha(el, 1, time, easing), this.tweenScale(el, target.x, target.y, time, easing)]);
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
		const txt = makeStyledText({ content: label, size: 30, silverGradient: true, stroke: true });
		txt.anchor.set(0.5);
		btn.addChild(txt);
		btn.interactive = true;
		btn.eventMode = "static";
		btn.cursor = "pointer";
		return btn;
	}
}
