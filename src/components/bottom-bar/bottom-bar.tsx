import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { Balance } from "@components/balance";
import { useClickOutside } from "@hooks/useClickOutside";
import { useBottomBarStore } from "@stores";

import { AudioSection } from "./audio-section";
import { AutoplaySection } from "./autoplay-section";
import { BetSection } from "./bet-section";
import { BonusSection } from "./bonus-section";
import { CallToActionSection } from "./call-to-action-section";
import { MasterVolume } from "./master-volume";
import { MenuSection } from "./menu-section";
import { TurboSection } from "./turbo-section";
import { WinSection } from "./win-section";

const DESKTOP_MIN = "(min-width: 1024px)";

function useIsDesktop(): boolean {
	const [isDesktop, setIsDesktop] = useState(
		() => typeof window !== "undefined" && window.matchMedia(DESKTOP_MIN).matches
	);
	useEffect(() => {
		const mq = window.matchMedia(DESKTOP_MIN);
		const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);
	return isDesktop;
}

const Bar = styled.div`
	display: flex;
	align-items: center;
	position: absolute;
	bottom: 50px;
	left: 50%;
	transform: translateX(-50%);
	margin: auto;
	gap: 12px;
	height: 120px;
	max-width: 1340px;
	width: 100%;
`;

const LeftPanel = styled.div`
	flex: 1;
	align-self: stretch;
	display: flex;
	align-items: center;
	gap: 32px;
	padding: 0px 0px 0px 8px;
	box-sizing: border-box;
	background: rgba(var(--rgb-surface), 0.6);
	border-radius: 8px;
	pointer-events: all;
`;

const Spacer = styled.div`
	flex: 1;
`;

const RightPanel = styled.div`
	align-self: stretch;
	display: flex;
	align-items: center;
	gap: 20px;
	padding: 0 16px;
	background: var(--color-surface);
	border-radius: 8px;
	overflow: visible;
	pointer-events: all;
`;

/* The menu / audio and autoplay / turbo button columns. */
const SideButtons = styled.div`
	align-self: stretch;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-between;
	padding: 8px 0px;
	gap: 8px;
`;

const MobileBar = styled.div`
	position: absolute;
	inset: 0;
	pointer-events: none;
`;

const ActionCluster = styled.div`
	position: absolute;
	left: 12px;
	right: 12px;
	bottom: 76px;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 8px;

	@media (orientation: landscape) {
		left: auto;
		right: 12px;
		top: 0;
		bottom: 0;
		flex-direction: column;
		justify-content: center;
		gap: 14px;
	}
`;

const InfoCluster = styled.div`
	position: absolute;
	left: 16px;
	right: 16px;
	bottom: 16px;
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
	column-gap: 8px;

	> *:nth-child(1) {
		grid-column: 1;
		justify-self: start;
	}
	> *:nth-child(2) {
		grid-column: 2;
		justify-self: center;
	}
	> *:nth-child(3) {
		grid-column: 3;
		justify-self: end;
		align-items: flex-end;
	}

	@media (orientation: landscape) {
		bottom: 12px;

		/* Win is not shown in the landscape design */
		> *:nth-child(3) {
			display: none;
		}
	}
`;

const DesktopBar = () => {
	const volumeOpen = useBottomBarStore(s => s.volumeOpen);
	const setVolumeOpen = useBottomBarStore(s => s.setVolumeOpen);
	const masterVolumeRef = useRef<HTMLDivElement>(null);
	useClickOutside(masterVolumeRef, () => setVolumeOpen(false));
	return (
		<Bar>
			{volumeOpen && <MasterVolume containerRef={masterVolumeRef} />}
			<BonusSection />
			<LeftPanel>
				<SideButtons>
					<MenuSection />
					<AudioSection />
				</SideButtons>
				<Balance />
				<Spacer />
				<RightPanel>
					<WinSection />
					<BetSection />
					<CallToActionSection />
					<SideButtons>
						<AutoplaySection />
						<TurboSection />
					</SideButtons>
				</RightPanel>
			</LeftPanel>
		</Bar>
	);
};

const MobileBarLayout = () => (
	<MobileBar>
		<ActionCluster>
			<MenuSection />
			<TurboSection />
			<CallToActionSection />
			<AutoplaySection />
			<BonusSection />
		</ActionCluster>
		<InfoCluster>
			<Balance />
			<WinSection />
			<BetSection />
		</InfoCluster>
	</MobileBar>
);

/** The controls along the bottom of the screen: a bar on desktop, floating clusters on phones. */
export const BottomBar = () => (useIsDesktop() ? <DesktopBar /> : <MobileBarLayout />);
