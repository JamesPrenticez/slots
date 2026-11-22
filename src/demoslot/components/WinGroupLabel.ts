import { Container, Text } from "pixi.js";

import { fmt } from "@ui/helpers";

import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";
import { SLOT_CONFIG } from "../config/GameConfig.js";

/**
 * WinGroupLabel floating win amounts shown over each winning cluster.
 * Labels appear when symbols are removed and fade out during cascade.
 */
export class WinGroupLabel extends Container {
	private readonly pool: Text[] = [];

	constructor() {
		super();
		ViewStore.getInstance().set("WinGroupLabel", this);
	}

	public async showWinGroups(
		groups: Array<{
			amount: number;
			positions: Array<{ reel: number; row: number }>;
		}>,
		multiplierCells: Array<{ reel: number; row: number; multiplier: number }>
	): Promise<void> {
		this.clear();
		const { symbolSize, columns, rows } = SLOT_CONFIG;
		const animations: Promise<void>[] = [];

		for (const group of groups) {
			if (group.amount === 0) continue;
			const avgReel = group.positions[Math.floor(group.positions.length / 2)].reel,
				avgRow = group.positions[Math.floor(group.positions.length / 2)].row,
				x = avgReel * symbolSize - (columns * symbolSize) / 2 + symbolSize / 2,
				y = avgRow * symbolSize - (rows * symbolSize) / 2 + symbolSize / 2;
			const multiplier = this.getMultiplier(group.positions, multiplierCells);
			const label = this.createLabel(multiplier > 1 ? `${fmt(group.amount)}x${multiplier}` : fmt(group.amount));

			label.position.set(x, y);
			this.addChild(label);
			this.pool.push(label);
			animations.push(this.animateLabel(label));
		}

		return Promise.all(animations).then(() => {});
	}

	private getMultiplier(
		positions: Array<{ reel: number; row: number }>,
		multiplierCells: Array<{ reel: number; row: number; multiplier: number }>
	): number {
		let total = 0;

		for (const pos of positions) {
			const cell = multiplierCells.find(m => m.reel === pos.reel && m.row === pos.row);
			if (cell) {
				total += cell.multiplier;
			}
		}

		return total;
	}

	private animateLabel(label: Text): Promise<void> {
		return new Promise<void>(resolve => {
			const duration = 1200,
				startTime = performance.now(),
				startY = label.position.y;

			const tick = () => {
				const progress = Math.min((performance.now() - startTime) / duration, 1);
				if (progress < 0.15) {
					const p = progress / 0.15;
					label.scale.set(1 - Math.pow(1 - p, 3));
				} else if (progress < 0.7) {
					label.scale.set(1);
				} else {
					const p = (progress - 0.7) / 0.3;
					label.alpha = 1 - p;
					label.position.y = startY - p * 40;
				}
				if (progress >= 1) {
					label.alpha = 0;
					resolve();
					return;
				}
				requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		});
	}

	public clear(): void {
		this.removeChildren();
		this.pool.length = 0;
	}

	private createLabel(text: string): Text {
		const t = new Text({
			text,
			style: {
				fontSize: 50,
				fill: 0xffffff,
				fontWeight: "bold",
				align: "center",
				stroke: { color: 0x000000, width: 4 }
			}
		});
		t.anchor.set(0.5);
		t.scale.set(0);
		return t;
	}
}
