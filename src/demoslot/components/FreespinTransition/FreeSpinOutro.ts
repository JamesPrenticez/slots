import { Container, Rectangle, Sprite, Text, Ticker } from "pixi.js";

import { makeStyledText } from "../../../common/util/Texthelper.js";
import { Resizable } from "../../../slot/renderer/Resizable.js";
import { THEME } from "../../config/ThemeConfig.js";
import { getFreeSpinOutroAnim, type OutroParts } from "./FreeSpinOutroAnim.js";
import { Sparkles } from "./Sparkles.js";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

const T = THEME.freeSpinOutro;

export class FreeSpinOutro extends Resizable {
	private readonly glow = Sprite.from(T.textures.glow);
	private readonly plate = Sprite.from(T.textures.plate);
	private readonly fork = Sprite.from(T.textures.cutlery);
	private readonly title = Sprite.from(T.textures.title);
	private readonly totalText: Text;
	private readonly subtitleText: Text;
	private readonly btn: Container;
	private readonly sparkles = new Sparkles();

	private readonly anim = getFreeSpinOutroAnim(T.anim);
	private titleBase = { x: 1, y: 1 };
	private plateBase = { x: 1, y: 1 };
	private glowBase = { x: 1, y: 1 };
	private cutleryScale = 1;
	private totalBase = { x: 1, y: 1 };
	private subtitleBase = { x: 1, y: 1 };

	private outroScreen = new Rectangle(0, 0, DESIGN_W, DESIGN_H);

	private readonly glowRotationTick = (ticker: Ticker): void => {
		this.glow.rotation += T.glowRotationSpeed * ticker.deltaMS;
	};

	constructor() {
		super();
		for (const s of [this.glow, this.plate, this.fork, this.title]) s.anchor.set(0.5);

		this.totalText = makeStyledText({ content: "", size: 100, color: 0xffd700, bold: true, stroke: true });
		this.subtitleText = makeStyledText({ content: "", size: 62, silverGradient: true, bold: true, stroke: true });
		this.btn = this.makeButton(T.text.button);

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
		this.subtitleText.text = T.text.subtitle.replace("{n}", String(freeSpinsPlayed));

		const glowTex = this.glow.texture;
		const glowCover = Math.max(DESIGN_W / glowTex.width, DESIGN_H / glowTex.height) * 1.4;
		this.glow.scale.set(glowCover);
		this.glowBase = { x: glowCover, y: glowCover };

		const plateFit = (DESIGN_W * T.plateWidth) / this.plate.texture.width;
		this.plate.scale.set(plateFit);
		this.plateBase = { x: plateFit, y: plateFit };

		const titleFit = (DESIGN_W * T.titleWidth) / this.title.texture.width;
		this.title.scale.set(titleFit);
		this.titleBase = { x: titleFit, y: titleFit };

		this.fork.scale.set(1);
		this.cutleryScale = (DESIGN_W * T.cutleryWidth) / this.fork.width;
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
			{ el: this.title, gapAfter: T.titleToPlateGap },
			{
				el: this.plate,
				gapAfter: T.plateToButtonGap,
				extra: [this.fork, this.totalText, this.subtitleText, this.sparkles]
			},
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

		// Subtitle sits a bit below plate centre
		this.subtitleText.position.y = this.plate.y + this.plate.height * 0.22;

		this.sparkles.position.copyFrom(this.plate.position);
		this.sparkles.setRadius(this.plate.width * 0.6, this.plate.height * 0.6);
	}

	// ── Animations ────────────────────────────────────────────────────────────

	private get parts(): OutroParts {
		return {
			glow: this.glow,
			plate: this.plate,
			fork: this.fork,
			title: this.title,
			total: this.totalText,
			subtitle: this.subtitleText,
			btn: this.btn,
			sparkles: this.sparkles,
			base: {
				title: this.titleBase,
				plate: this.plateBase,
				total: this.totalBase,
				subtitle: this.subtitleBase,
				cutlery: this.cutleryScale
			},
			spinGlow: on => {
				Ticker.shared.remove(this.glowRotationTick);
				if (on) Ticker.shared.add(this.glowRotationTick);
			}
		};
	}

	private async playReveal(): Promise<void> {
		this.resetForReveal();
		await this.anim.playReveal(this.parts);
	}

	private resetForReveal(): void {
		this.title.alpha = 0;
		this.title.scale.set(this.titleBase.x * T.startScale.all, this.titleBase.y * T.startScale.all);

		this.plate.alpha = 0;
		this.plate.scale.set(this.plateBase.x * T.startScale.all, this.plateBase.y * T.startScale.all);

		this.glow.alpha = 0;
		this.glow.scale.set(this.glowBase.x * T.startScale.glow, this.glowBase.y * T.startScale.glow);

		this.fork.alpha = 0;
		this.fork.scale.set(this.cutleryScale * T.startScale.all, this.cutleryScale * T.startScale.all);

		this.totalText.alpha = 0;
		this.totalText.scale.set(this.totalBase.x, this.totalBase.y);

		this.subtitleText.alpha = 0;
		this.subtitleText.scale.set(this.subtitleBase.x * T.startScale.all, this.subtitleBase.y * T.startScale.all);

		this.btn.alpha = 0;
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
