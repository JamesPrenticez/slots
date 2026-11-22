import { type RefObject, useEffect, useRef } from "react";
import styled from "styled-components";

import { Slider } from "@components/slider/slider";
import { useAudioStore, useBottomBarStore } from "@stores";
import { ICONS } from "@ui/icons";

const Container = styled.div`
	position: absolute;
	bottom: 100%;
	left: 13.2rem;
	margin-bottom: var(--spacing-xs);
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-md);
	background: var(--menu-panel-bg);
	border-radius: var(--border-radius-md);
	color: var(--color-white);
	pointer-events: all;

	svg {
		width: calc(var(--size-control) / 2);
		height: calc(var(--size-control) / 2);
		flex-shrink: 0;
		fill: currentColor;
		* {
			fill: currentColor;
		}
	}
`;

type Props = { containerRef: RefObject<HTMLDivElement | null> };

export const MasterVolume = ({ containerRef }: Props) => {
	const muted = useAudioStore(s => s.muted);
	const masterVolume = useAudioStore(s => s.masterVolume);
	const setMasterVolume = useAudioStore(s => s.setMasterVolume);
	const setVolumeOpen = useBottomBarStore(s => s.setVolumeOpen);

	const timerRef = useRef<number | undefined>(undefined);

	const startTimer = () => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			setVolumeOpen(false);
		}, 3000);
	};

	const clearTimer = () => {
		if (timerRef.current) clearTimeout(timerRef.current);
	};

	useEffect(() => {
		startTimer(); // auto-close if opened without pointer over it
		return clearTimer;
	}, []);

	return (
		<Container
			ref={containerRef}
			onClick={e => e.stopPropagation()}
			onMouseEnter={clearTimer}
			onMouseLeave={startTimer}
			onTouchStart={clearTimer}
			onTouchEnd={startTimer}
		>
			{muted ? ICONS.AudioMutedIcon : ICONS.AudioIcon}
			<Slider value={masterVolume} onChange={setMasterVolume} ariaLabel="Master volume" />
		</Container>
	);
};
