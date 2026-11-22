import styled from "styled-components";

import { BottomBar } from "@components/bottom-bar";
import { useGameStore } from "@stores";

import { InfoBlock, InfoLabel, InfoValue } from "./info-block";

const HudRoot = styled.div`
	position: absolute;
	inset: 0;
	pointer-events: none;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 12px 16px 24px;
	font-family: "Enduro", sans-serif;

	button {
		pointer-events: all;
	}
`;

const HudTop = styled.div`
	display: flex;
	justify-content: center;
`;

export const FreeSpinsCounter = () => {
	const remaining = useGameStore(s => s.freeSpinsRemaining);
	const total = useGameStore(s => s.freeSpinsTotal);
	if (total === 0) return null;
	return (
		<InfoBlock>
			<InfoLabel>FREE SPINS</InfoLabel>
			<InfoValue>
				{remaining} / {total}
			</InfoValue>
		</InfoBlock>
	);
};

export const Hud = () => (
	<HudRoot>
		<HudTop>
			<FreeSpinsCounter />
		</HudTop>
		<BottomBar />
	</HudRoot>
);
