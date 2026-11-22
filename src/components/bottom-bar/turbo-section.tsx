import styled from "styled-components";

import { IconButton } from "@game-ui";
import { useGameStore } from "@stores";
import { ICONS } from "@ui/icons";

import { GameBridge } from "../../engine/GameBridge";

const StyledTurboSection = styled(IconButton)`
	background-color: var(--color-black);

	svg.icon-outline * {
		stroke: var(--color-white);
	}

	&[data-active="true"] svg.icon-outline * {
		stroke: var(--color-primary);
		fill: var(--color-primary);
	}
`;

export const TurboSection = () => {
	const isTurbo = useGameStore(s => s.isTurboSpinning);

	const handleClick = () => {
		GameBridge.getInstance().toggleTurbo(!isTurbo);
	};

	return (
		<StyledTurboSection onClick={handleClick} data-active={isTurbo} aria-label="turbo button">
			{ICONS.TurboIcon}
		</StyledTurboSection>
	);
};
