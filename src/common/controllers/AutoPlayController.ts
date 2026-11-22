import { useGameStore } from "@stores";

import { Controller } from "../../fanfarebaseslot/Controller";
import { CoreState } from "../CoreState";
import { AutoPlayModel } from "../models/AutoPlayModel";

export class AutoPlayController extends Controller {
	private static instance?: AutoPlayController;
	public static getInstance(): AutoPlayController {
		AutoPlayController.instance ??= new AutoPlayController();
		return AutoPlayController.instance;
	}

	private spinTrigger?: () => void;

	private constructor() {
		super();
	}

	/** Called once by SlotMachineController so autoplay can trigger real spins through it */
	public registerSpinTrigger(fn: () => void): void {
		this.spinTrigger = fn;
	}

	public onRunAutoPlay(times: number): void {
		if (
			(CoreState.isState("WINPRESENTATION") || CoreState.isState("BIGWIN_PRESENTATION") || CoreState.isState("IDLE")) &&
			CoreState.isBehaviourState("NORMAL")
		) {
			CoreState.setBehaviourState("AUTO_PLAY");
			const model = AutoPlayModel.getInstance();
			model.setNumber(times);

			if (CoreState.isState("IDLE")) {
				model.onUpCountSpin();
				this.spinTrigger?.();
			}
		}
	}

	public onStopAutoPlay(): void {
		CoreState.setBehaviourState("NORMAL");
		AutoPlayModel.getInstance().cancel();
		useGameStore.getState().setAutoSpinning(false);
	}

	public continueAutoPlay(): void {
		const model = AutoPlayModel.getInstance();
		if (model.isAutoPlayAvailable()) {
			CoreState.setState("IDLE");
			model.onUpCountSpin();
			this.spinTrigger?.();
		} else {
			this.onStopAutoPlay();
		}
	}
}
