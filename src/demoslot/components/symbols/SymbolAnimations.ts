import { Tweener } from "../../../common/util/Tweener.js";
import type { SymbolView } from "./SymbolView.js";

/**
 * SymbolAnimations — static helpers for symbol animation sequences.
 * Keeps animation logic out of SymbolView itself.
 *
 * All animations use Tweener (frame-accurate, abortable).
 * Replace with Spine animations when assets are ready.
 */
export class SymbolAnimations {
	/** Quick scale pulse on symbol land */
	public static async landPop(view: SymbolView): Promise<void> {
		const tweener = Tweener.getInstance();
		await tweener.addTween(view.scale as object & { x: number; y: number }, {
			x: 1.12,
			y: 1.12,
			time: 80
		});
		await tweener.addTween(view.scale as object & { x: number; y: number }, {
			x: 1,
			y: 1,
			time: 120
		});
	}

	/** Looping idle bounce for a highlighted win symbol */
	public static winPulse(view: SymbolView): () => void {
		let cancelled = false;
		const loop = async () => {
			while (!cancelled) {
				await Tweener.getInstance().addTween(view.scale as object & { x: number; y: number }, {
					x: 1.08,
					y: 1.08,
					time: 300
				});
				if (cancelled) break;
				await Tweener.getInstance().addTween(view.scale as object & { x: number; y: number }, {
					x: 1,
					y: 1,
					time: 300
				});
			}
		};
		void loop();
		return () => {
			cancelled = true;
		};
	}
}
