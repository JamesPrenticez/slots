import { Container, Graphics, Rectangle, Sprite, Text, Ticker } from "pixi.js";

import { makeStyledText } from "../../../common/util/Texthelper.js";
import { Resizable } from "../../../slot/renderer/Resizable.js";
import { THEME } from "../../config/ThemeConfig.js";
import { getFreeSpinRetriggerAnim, type RetriggerParts } from "./FreeSpinRetriggerAnim.js";
import { Sparkles } from "./Sparkles.js";

const T = THEME.freeSpinRetrigger;

export class FreeSpinRetriggerPopup extends Resizable {
	private readonly overlay = new Graphics();
	private readonly glow = Sprite.from(T.textures.glow);
	private readonly title = Sprite.from(T.textures.title);
	private readonly youWonText = makeStyledText({
		content: T.text.youWon,
		size: 120,
		silverGradient: true,
		stroke: true
	});
	private readonly numberText = makeStyledText({ content: "", size: 300, color: 0xffd700, bold: true, stroke: true });
	private readonly freeSpinText = makeStyledText({
		content: T.text.freeSpin,
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
	private readonly btn = this.makeButton(T.text.button);
	private readonly sparkles = new Sparkles();

	private readonly anim = getFreeSpinRetriggerAnim(T.anim);
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
		this.glow.rotation += T.glowRotationSpeed * ticker.deltaMS;
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
		this.upgradeText.text = modeUpgradeTo ? (T.text.upgrade[modeUpgradeTo] ?? "") : "";
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

	private get parts(): RetriggerParts {
		return {
			glow: this.glow,
			title: this.title,
			youWon: this.youWonText,
			number: this.numberText,
			freeSpin: this.freeSpinText,
			upgrade: this.upgradeText,
			btn: this.btn,
			sparkles: this.sparkles,
			base: {
				title: this.titleBase,
				youWon: this.youWonBase,
				freeSpin: this.freeSpinBase,
				number: this.numberBase,
				upgrade: this.upgradeBase
			},
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

	private resetForReveal(): void {
		this.title.alpha = 1;
		this.title.scale.set(this.titleBase.x * T.startScale.title, this.titleBase.y * T.startScale.title);

		this.glow.alpha = 0;
		this.glow.scale.set(this.glowBase.x, this.glowBase.y);

		this.youWonText.alpha = 0;
		this.youWonText.scale.set(this.youWonBase.x * T.startScale.youWon, this.youWonBase.y * T.startScale.youWon);

		this.numberText.alpha = 0;
		this.numberText.scale.set(this.numberBase.x, this.numberBase.y);

		this.freeSpinText.alpha = 0;
		this.freeSpinText.scale.set(
			this.freeSpinBase.x * T.startScale.freeSpin,
			this.freeSpinBase.y * T.startScale.freeSpin
		);

		if (this.upgradeText.visible) {
			this.upgradeText.alpha = 0;
			this.upgradeText.scale.set(this.upgradeBase.x, this.upgradeBase.y);
		}

		this.btn.alpha = 0;
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
			{ el: this.title, gapAfter: T.gaps.titleToWon },
			{ el: this.youWonText, gapAfter: T.gaps.wonToNumber },
			{ el: this.numberText, gapAfter: T.gaps.numberToFreeSpin, extra: [this.glow, this.sparkles] },
			{ el: this.freeSpinText, gapAfter: this.upgradeText.visible ? 20 : T.gaps.freeSpinToButton },
			...(this.upgradeText.visible ? [{ el: this.upgradeText, gapAfter: T.gaps.freeSpinToButton - 20 }] : []),
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
			T.maxFitScale,
			(screenWidth * T.fitMargin) / totalWidth,
			(screenHeight * T.fitMargin) / totalHeight
		);
		this.scale.set(fit);
		this.position.set(cx, cy);

		const localW = screenWidth / fit;
		const localH = screenHeight / fit;
		this.overlay
			.clear()
			.rect(-localW / 2, -localH / 2, localW, localH)
			.fill({ color: 0x000000, alpha: T.overlayAlpha });

		const base = (el: Sprite | Text) => ({ x: el.scale.x, y: el.scale.y });
		this.titleBase = base(this.title);
		this.glowBase = base(this.glow);
		this.youWonBase = base(this.youWonText);
		this.freeSpinBase = base(this.freeSpinText);
		this.numberBase = base(this.numberText);
		this.upgradeBase = base(this.upgradeText);

		let y = -totalHeight / 2 - (screenHeight * T.verticalOffsetRatio) / fit;

		for (const row of rows) {
			y += row.el.height / 2;
			row.el.position.set(0, y);
			for (const extraEl of row.extra ?? []) extraEl.position.set(0, y);
			y += row.el.height / 2 + row.gapAfter;
		}

		this.sparkles.setRadius(this.numberText.width * 0.55, this.numberText.height * 0.55);
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
