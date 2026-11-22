import styled from "styled-components";

import { IconButton } from "@game-ui";
import { useAudioStore, useBottomBarStore } from "@stores";
import { ICONS } from "@ui/icons";

const StyledAudioSection = styled(IconButton)`
	background-color: var(--color-black);
	color: var(--color-white);
`;

export const AudioSection = () => {
	const muted = useAudioStore(s => s.muted);
	const toggleMuted = useAudioStore(s => s.toggleMuted);
	const setVolumeOpen = useBottomBarStore(s => s.setVolumeOpen);

	return (
		<StyledAudioSection
			data-ignore-click-away
			onClick={() => {
				toggleMuted();
				setVolumeOpen(true);
			}}
			aria-pressed={muted}
			aria-label={muted ? "Unmute" : "Mute"}
		>
			{muted ? ICONS.AudioMutedIcon : ICONS.AudioIcon}
		</StyledAudioSection>
	);
};
