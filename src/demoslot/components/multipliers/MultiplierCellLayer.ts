import { Container, FillGradient, Sprite, Text, Texture } from "pixi.js";

import { CoreState } from "../../../common/CoreState";
import { ViewStore } from "../../../fanfarebaseslot/ViewStore";
import { SLOT_CONFIG } from "../../config/GameConfig";

export interface MultiplierCellData {
	reel: number;
	row: number;
	multiplier: number;
}

interface MultiplierTier {
	threshold: number;
	bgTexture: string;
	strokeColor: number;
	gradientStart: number;
	gradientEnd: number;
}

interface SlimeTier {
	threshold: number;
	bgTexture: string;
}

// Sorted descending — first tier whose threshold the multiplier meets or exceeds wins
const MULTIPLIER_TIERS: MultiplierTier[] = [
	{
		threshold: 1024,
		bgTexture: "1024x_Bg.png",
		strokeColor: 0x9dec9b,
		gradientStart: 0x007228,
		gradientEnd: 0x2b9964
	},
	{ threshold: 128, bgTexture: "128x_Bg.png", strokeColor: 0xa26fe0, gradientStart: 0x3a0a99, gradientEnd: 0x643eaf },
	{ threshold: 16, bgTexture: "16x_Bg.png", strokeColor: 0xf29c62, gradientStart: 0xad2300, gradientEnd: 0xbf5338 },
	{ threshold: 2, bgTexture: "2x_Bg.png", strokeColor: 0xe4a668, gradientStart: 0x4c290b, gradientEnd: 0x71553e }
];

// Sorted descending — first tier whose threshold the multiplier meets or exceeds wins.
// 256x and 1024x share the top asset since only three slime textures exist.
const SLIME_TIERS: SlimeTier[] = [
	{ threshold: 256, bgTexture: "slime_Tier3.png" },
	{ threshold: 16, bgTexture: "slime_Tier2.png" },
	{ threshold: 2, bgTexture: "slime_Tier1.png" }
];

function getTierForMultiplier(multiplier: number): MultiplierTier {
	return MULTIPLIER_TIERS.find(tier => multiplier >= tier.threshold) ?? MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1];
}

function getSlimeTierForMultiplier(multiplier: number): SlimeTier {
	return SLIME_TIERS.find(tier => multiplier >= tier.threshold) ?? SLIME_TIERS[SLIME_TIERS.length - 1];
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
		label.text = `×${cell.multiplier}`;
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
		background.scale.set(0.6);
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

		const labelHeight = this.symbolSize * 0.3;
		label.style.fill = buildGradient(tier, labelHeight);
		label.style.stroke = { color: tier.strokeColor, width: 3 };

		this.cellTiers.set(key, tierKey);
	}

	private buildLabel(tier: MultiplierTier): Text {
		const labelHeight = this.symbolSize * 0.3;

		const label = new Text({
			text: "",
			style: {
				fontFamily: "Titan One",
				fontWeight: "900",
				fontSize: this.symbolSize * 0.28,
				fill: buildGradient(tier, labelHeight),
				stroke: {
					color: tier.strokeColor,
					width: 3,
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
