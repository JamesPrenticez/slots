import { BIG_WIN_TIERS } from "../../common/components/results/BigWinsEffect.js";
import { CoreState } from "../../common/CoreState.js";
import { GameBridge } from "../../engine/GameBridge.js";
import { CharacterAnimation } from "../../fanfarebaseslot/CharacterAnimation.js";
import { ViewStore } from "../../fanfarebaseslot/ViewStore.js";

const views = () => ViewStore.getInstance();
const CHARACTER_ANIMS: CharacterAnimation[] = ["idle", "spin", "win", "big-win", "max-win", "lose", "interact"];

/** Dev-only: force-plays presentation sequences from the debug menu (only while IDLE). */
export function registerDebugActions(): void {
	const actions: { label: string; run: () => void | Promise<void> }[] = [];

	for (const tier of BIG_WIN_TIERS) {
		actions.push({
			label: `big win: ${tier.name}`,
			run: async () => {
				CoreState.setState("BIGWIN_PRESENTATION");
				await views().get("BigWinEffect").show(tier.minMultiplier);
				views().get("BigWinEffect").hide();
				CoreState.setState("IDLE");
			}
		});
	}

	const fs = () => views().get("FreeSpinScreen");
	actions.push(
		{
			label: "free spins: intro",
			run: () =>
				fs()
					.showIntro(10, 0)
					.then(() => fs().switchBackground(false))
		},
		{ label: "free spins: retrigger", run: () => fs().showRetrigger(5) },
		{ label: "free spins: outro", run: () => fs().showOutro(12345, 10) }
	);

	if (views().has("SpineCharacter")) {
		for (const anim of CHARACTER_ANIMS) {
			actions.push({ label: `character: ${anim}`, run: () => views().get("SpineCharacter").play(anim) });
		}
	}

	GameBridge.getInstance().registerDebugActions(actions);
}
