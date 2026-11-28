import { Container, FillGradient, Sprite, Text, Texture } from "pixi.js";

import { CoreState } from "../../../common/CoreState";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore";
import { SLOT_CONFIG } from "../../config/GameConfig";
import { type MultiplierTier, THEME } from "../../config/ThemeConfig";

export interface MultiplierCellData {
	reel: number;
	row: number;
	multiplier: number;
}

const T = THEME.multipliers;

function getTierForMultiplier(multiplier: number): MultiplierTier {
	return T.tiers.find(tier => multiplier >= tier.threshold) ?? T.tiers[T.tiers.length - 1];
}

function getSlimeTierForMultiplier(multiplier: number): { threshold: number; bgTexture: string } {
	return T.slimeTiers.find(tier => multiplier >= tier.threshold) ?? T.slimeTiers[T.slimeTiers.length - 1];
}

function buildGradient(tier: MultiplierTier, height: number): FillGradient {
	return new FillGradient({
		type: "linear",
		start: { x: 0, y: 0 },
		end: { x: 0, y: height },
		colorStops: [
			{ offset: 0, color: tier.gradientStart },
			{ offset: 1, color: tier.gradientEnd }
		],
		textureSpace: "local"
	});
}

export class MultiplierCellLayer extends Container {
	private readonly cells = new Map<string, Container>();
	private readonly labels = new Map<string, Text>();
	private readonly cellTiers = new Map<string, string>();
	private readonly slimeCells = new Set<string>();
	private readonly symbolSize = SLOT_CONFIG.symbolSize;

	constructor() {
		super();
		ViewStore.getInstance().set("MultiplierCellLayer", this);
	}

	public updateCells(multiplierCells: MultiplierCellData[]): void {
		if (!CoreState.isBehaviourState("FREE_SPINS")) {
			this.removeInactiveCells(multiplierCells);
		}

		for (const cell of multiplierCells) {
			this.updateCell(cell);
		}
	}

	public clearAll(): void {
		this.removeChildren();
		this.cells.clear();
		this.labels.clear();
		this.cellTiers.clear();
		this.slimeCells.clear();
	}

	public updateCell(cell: MultiplierCellData, isSlime?: boolean): void {
		const key = this.getKey(cell.reel, cell.row);

		if (isSlime) {
			this.slimeCells.add(key);
		}
		const hasSlime = this.slimeCells.has(key);

		const tier = getTierForMultiplier(cell.multiplier);
		const bgTexture = hasSlime ? getSlimeTierForMultiplier(cell.multiplier).bgTexture : tier.bgTexture;
		const tierKey = `${tier.threshold}_${hasSlime}`;

		if (!this.cells.has(key)) {
			this.createCell(key, tier, bgTexture, tierKey);
		} else if (this.cellTiers.get(key) !== tierKey) {
			this.applyTier(key, tier, bgTexture, tierKey);
		}

		const container = this.cells.get(key)!;
		const label = this.labels.get(key)!;

		container.position.set(this.getCellX(cell.reel), this.getCellY(cell.row));
		label.text = `${T.label.prefix}${cell.multiplier}`;
	}

	private removeInactiveCells(multiplierCells: MultiplierCellData[]): void {
		const activeKeys = new Set(multiplierCells.map(cell => this.getKey(cell.reel, cell.row)));

		for (const [key, container] of this.cells) {
			if (!activeKeys.has(key)) {
				this.removeChild(container);
				this.cells.delete(key);
				this.labels.delete(key);
				this.cellTiers.delete(key);
				this.slimeCells.delete(key);
			}
		}
	}

	private createCell(key: string, tier: MultiplierTier, bgTexture: string, tierKey: string): void {
		const container = new Container();
		//container.rotation = -0.08;

		const background = Sprite.from(bgTexture);
		background.scale.set(T.bgScale);
		background.anchor.set(0.5);

		const label = this.buildLabel(tier);

		container.addChild(background);
		container.addChild(label);

		this.addChild(container);

		this.cells.set(key, container);
		this.labels.set(key, label);
		this.cellTiers.set(key, tierKey);
	}

	private applyTier(key: string, tier: MultiplierTier, bgTexture: string, tierKey: string): void {
		const container = this.cells.get(key)!;
		const label = this.labels.get(key)!;
		const background = container.getChildAt(0) as Sprite;

		background.texture = Texture.from(bgTexture);

		const labelHeight = this.symbolSize * T.label.heightRatio;
		label.style.fill = buildGradient(tier, labelHeight);
		label.style.stroke = { color: tier.strokeColor, width: T.label.strokeWidth };

		this.cellTiers.set(key, tierKey);
	}

	private buildLabel(tier: MultiplierTier): Text {
		const labelHeight = this.symbolSize * T.label.heightRatio;

		const label = new Text({
			text: "",
			style: {
				fontFamily: T.label.fontFamily,
				fontWeight: T.label.fontWeight as "900",
				fontSize: this.symbolSize * T.label.sizeRatio,
				fill: buildGradient(tier, labelHeight),
				stroke: {
					color: tier.strokeColor,
					width: T.label.strokeWidth,
					join: "round"
				},
				align: "center"
			}
		});

		label.anchor.set(0.5);
		label.position.set(0);
		return label;
	}

	private getKey(reel: number, row: number): string {
		return `${reel}_${row}`;
	}

	private getCellX(reel: number): number {
		const totalWidth = SLOT_CONFIG.columns * this.symbolSize + (SLOT_CONFIG.columns - 1) * SLOT_CONFIG.reelGap;
		return reel * (this.symbolSize + SLOT_CONFIG.reelGap) - totalWidth / 2 + this.symbolSize / 2;
	}

	private getCellY(row: number): number {
		return row * this.symbolSize - (SLOT_CONFIG.rows * this.symbolSize) / 2 + this.symbolSize / 2;
	}
}
