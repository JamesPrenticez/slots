import styled from "styled-components";

import { InfoBlock, InfoLabel, InfoValue } from "@components/hud/info-block";
import { useGameStore } from "@stores";
import { fmt } from "@ui/helpers";

const WinValue = styled(InfoValue)`
	color: var(--color-win);
`;

/** The last spin's payout; hidden while there is none. */
export const WinSection = () => {
	const win = useGameStore(s => s.win);
	if (win === 0) return null;
	return (
		<InfoBlock>
			<InfoLabel>WIN</InfoLabel>
			<WinValue>{fmt(win)}</WinValue>
		</InfoBlock>
	);
};
