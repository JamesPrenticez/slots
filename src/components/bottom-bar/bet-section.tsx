import styled from "styled-components";

import { useGameStore } from "@stores";
import { useModalStore } from "@stores";
import { fmt } from "@ui/helpers";

import { GameBridge } from "../../engine/GameBridge";

const Wrapper = styled.div`
	display: flex;
	align-items: center;
	gap: 14px;
`;

const Info = styled.button`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
	padding: 0;
	border: none;
	background: transparent;
	cursor: pointer;
	pointer-events: all;
	text-align: left;
	font: inherit;
`;

const Label = styled.span`
	color: var(--color-accent);
	letter-spacing: 1px;
	text-transform: uppercase;
	font-family: "Enduro Narrow";
	font-style: normal;
	font-weight: 700;
	font-size: 16px;
	line-height: 120%;
	letter-spacing: 0.02em;
	text-transform: uppercase;
`;

const Value = styled.span`
	color: var(--color-text-value);
	font-family: "Enduro";
	font-style: normal;
	font-weight: 850;
	font-size: 24px;
	line-height: 120%;
	letter-spacing: 0.02em;
	text-transform: uppercase;
`;

const Chevrons = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	pointer-events: all;
`;

const Divider = styled.span`
	width: 18px;
	height: 1px;
	background: var(--color-divider);
`;

const StepButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 22px;
	padding: 0;
	border: none;
	background: transparent;
	color: var(--color-text);
	cursor: pointer;

	svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	&:hover:not(:disabled) {
		color: var(--color-accent);
	}

	&:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
`;

const ChevronUp = () => (
	<svg viewBox="0 0 24 24">
		<polyline points="6 15 12 9 18 15" />
	</svg>
);
const ChevronDown = () => (
	<svg viewBox="0 0 24 24">
		<polyline points="6 9 12 15 18 9" />
	</svg>
);

const BetSection = () => {
	const bet = useGameStore(s => s.bet);
	const canRaise = useGameStore(s => s.canRaiseBet);
	const canLower = useGameStore(s => s.canLowerBet);
	const isIdle = useGameStore(s => s.gameState) === "IDLE";
	const openModal = useModalStore(s => s.openModal);

	return (
		<Wrapper>
			<Info onClick={e => openModal("bet", e.currentTarget)}>
				<Label>BET</Label>
				<Value>{fmt(bet)}</Value>
			</Info>
			<Chevrons>
				<StepButton disabled={!isIdle || !canRaise} onClick={() => GameBridge.getInstance().incrementBet()}>
					<ChevronUp />
				</StepButton>
				<Divider />
				<StepButton disabled={!isIdle || !canLower} onClick={() => GameBridge.getInstance().decrementBet()}>
					<ChevronDown />
				</StepButton>
			</Chevrons>
		</Wrapper>
	);
};

export { BetSection };
