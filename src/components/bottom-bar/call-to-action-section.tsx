import { useState } from "react";
import SpinSvg from "@assets/spin.svg?react";
import styled, { keyframes } from "styled-components";

import { GameSoundManager } from "@sound-manager";
import { useGameStore } from "@stores";

import { GameBridge } from "../../engine/GameBridge";
import { ViewStore } from "../../fanfarebaseslot/ViewStore";

const spin360 = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const StyledButton = styled.button`
	display: flex;
	background-color: transparent;
	border: none;
	padding: 0;
	cursor: pointer;
	pointer-events: all;

	svg {
		display: block;
	}

	@media (max-width: 1023px) {
		svg {
			width: 97px;
			height: 97px;
		}
	}

	.glow {
		stop-color: var(--color-white);
	}

	&:hover:not(:disabled) {
		.glow {
			stop-color: var(--color-primary);
		}
		.face {
			filter: brightness(0.5);
		}
	}

	&:disabled {
		cursor: default;
		.face {
			filter: brightness(0.5);
		}
	}

	svg.spin {
		animation: ${spin360} 0.6s ease-out forwards;
	}

	/* one svg, three modes: show only the active group */
	svg.mode-spin .mode-play,
	svg.mode-spin .mode-stop,
	svg.mode-play .mode-spin,
	svg.mode-play .mode-stop,
	svg.mode-stop .mode-spin,
	svg.mode-stop .mode-play {
		display: none;
	}

	.ring {
		stroke: var(--color-white);
	}

	.play-icon,
	.stop-icon {
		fill: var(--color-white);
	}

	&:hover:not(:disabled) {
		.ring {
			stroke: var(--color-primary);
			filter: drop-shadow(0 0 5px var(--color-primary));
		}
		.stop-icon {
			fill: var(--color-primary);
		}
	}
`;

const CallToActionSection = () => {
	const [spinning, setSpinning] = useState(false);
	const gameState = useGameStore(s => s.gameState);
	const isIdle = gameState === "IDLE";
	const isGameSpinning = gameState === "SPINNING";
	const isAuto = useGameStore(s => s.isAutoSpinning);
	const pendingAutoSpins = useGameStore(s => s.pendingAutoPlaySpins);
	const mode = isAuto ? "stop" : pendingAutoSpins > 0 ? "play" : "spin";
	const sound = GameSoundManager.getInstance();

	function handleClick() {
		if (mode === "stop") {
			GameBridge.getInstance().stopAutoSpin();
			return;
		}
		if (mode === "play") {
			useGameStore.getState().setPendingAutoPlaySpins(0);
			GameBridge.getInstance().startAutoSpin(pendingAutoSpins);
			return;
		}
		if (spinning || isGameSpinning) return;
		sound.cue("spinClick");
		setSpinning(true);
		const spine = ViewStore.getInstance().get("GameCharacter").getSpine();
		spine?.play("spin", false); // one-shot on track 0
		spine?.queue("idle", true);
		GameBridge.getInstance().requestSpin();
	}

	return (
		<StyledButton disabled={mode !== "stop" && (isGameSpinning || !isIdle)} onClick={handleClick}>
			<SpinSvg className={`mode-${mode}${spinning ? " spin" : ""}`} onAnimationEnd={() => setSpinning(false)} />
		</StyledButton>
	);
};

export { CallToActionSection };
