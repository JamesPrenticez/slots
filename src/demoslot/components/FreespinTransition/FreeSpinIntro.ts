import { Container, Rectangle, Sprite, Texture, Ticker } from "pixi.js";

import { makeStyledText } from "../../../common/util/Texthelper.js";
import { Resizable } from "../../../slot/renderer/Resizable.js";
import { THEME } from "../../config/ThemeConfig.js";
import { tex } from "../animUtil.js";
import { getFreeSpinIntroAnim, type IntroParts } from "./FreeSpinIntroAnim.js";
import { Sparkles } from "./Sparkles.js";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

const T = THEME.freeSpinIntro;

// ── Class ──────────────────────────────────────────────────────────────────────

export class FreeSpinIntro extends Resizable {
	// Sprites
	private readonly glow = Sprite.from(tex(T.textures.glow, 1));
	private readonly plate = Sprite.from(tex(T.textures.plate, 1));
	private readonly title = Sprite.from(tex(T.textures.title, 1));

	private readonly youWonText = makeStyledText({
		content: T.text.youWon,
		size: 100,
		silverGradient: true,
		stroke: true
	});
	private readonly numberText = makeStyledText({ content: "", size: 200, color: 0xffd700, bold: true, stroke: true });
	private readonly freeSpinText = makeStyledText({
		content: T.text.freeSpin,
		size: 100,
		silverGradient: true,
		stroke: true
	});
	private readonly btn = this.makeButton(T.text.button);
	private readonly sparkles = new Sparkles();

	private readonly anim = getFreeSpinIntroAnim(T.anim);
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
		this.glow.rotation += T.glowRotationSpeed * ticker.deltaMS;
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
		const tier = T.tierByMode[mode] ?? T.tierByMode[3];
		this.glow.texture = Texture.from(tex(T.textures.glow, tier));
		this.plate.texture = Texture.from(tex(T.textures.plate, tier));
		this.title.texture = Texture.from(tex(T.textures.title, tier));
		this.targetCount = count;
		this.numberText.text = `${count}`;
		this.dismissAnimationPromise = undefined;

		const glowTex = this.glow.texture;
		const glowCover = Math.max(DESIGN_W / glowTex.width, DESIGN_H / glowTex.height) * 1.4;
		this.glow.scale.set(glowCover);
		this.glowBase = { x: glowCover, y: glowCover };

		const plateFit = (DESIGN_W * T.plateWidth) / this.plate.texture.width;
		this.plate.scale.set(plateFit);

		const titleFit = (DESIGN_W * T.titleWidth) / this.title.texture.width;
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
			{ el: this.title, gapAfter: T.gaps.titleToWon },
			{ el: this.youWonText, gapAfter: T.gaps.wonToPlate },
			{ el: this.plate, gapAfter: T.gaps.plateToFreeSpin, extra: [this.numberText] },
			{ el: this.freeSpinText, gapAfter: T.gaps.freeSpinToButton },
			{ el: this.btn, gapAfter: 0 }
		];

		const totalHeight = rows.reduce((s, r) => s + r.el.height + r.gapAfter, 0);

		let y = -totalHeight / 2 + DESIGN_H * T.stackYOffset;
		for (const row of rows) {
			y += row.el.height / 2;
			row.el.position.set(0, y);
			for (const extra of row.extra ?? []) extra.position.set(0, y);
			y += row.el.height / 2 + row.gapAfter;
		}

		this.sparkles.position.copyFrom(this.plate.position);
		this.sparkles.setRadius(this.plate.width * 0.55, this.plate.height * 0.55);
	}

	// ── Animations (choreography lives in FreeSpinIntroAnim presets) ───────────

	private get parts(): IntroParts {
		return {
			glow: this.glow,
			plate: this.plate,
			title: this.title,
			youWon: this.youWonText,
			number: this.numberText,
			freeSpin: this.freeSpinText,
			btn: this.btn,
			sparkles: this.sparkles,
			base: {
				glow: this.glowBase,
				plate: this.plateBase,
				title: this.titleBase,
				youWon: this.youWonBase,
				freeSpin: this.freeSpinBase,
				number: this.numberBase
			},
			startScale: T.startScale,
			targetCount: this.targetCount,
			spinGlow: on => {
				Ticker.shared.remove(this.glowRotationTick);
				if (on) Ticker.shared.add(this.glowRotationTick);
			}
		};
	}

	private async playIntro(): Promise<void> {
		this.resetForReveal();
		await this.anim.playIntro(this.parts);
	}

	private runDismissAnimation(): Promise<void> {
		return this.anim.playDismiss(this.parts);
	}

	private resetForReveal(): void {
		const gb = this.glowBase;
		this.glow.alpha = 0;
		this.glow.scale.set(gb.x * T.startScale.glow, gb.y * T.startScale.glow);

		this.title.alpha = 0;
		this.title.scale.set(this.titleBase.x, this.titleBase.y);

		this.plate.alpha = 0;
		this.plate.scale.set(0, 0);

		this.youWonText.alpha = 0;
		this.youWonText.scale.set(this.youWonBase.x * T.startScale.youWon, this.youWonBase.y * T.startScale.youWon);

		this.numberText.alpha = 0;
		this.numberText.text = "0";
		this.numberText.scale.set(this.numberBase.x * T.startScale.count, this.numberBase.y * T.startScale.count);

		this.freeSpinText.alpha = 0;
		this.freeSpinText.scale.set(
			this.freeSpinBase.x * T.startScale.freeSpin,
			this.freeSpinBase.y * T.startScale.freeSpin
		);

		this.btn.alpha = 0;
		this.sparkles.alpha = 1;
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
