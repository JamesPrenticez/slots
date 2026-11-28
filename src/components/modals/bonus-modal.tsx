import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import styled, { css } from "styled-components";

import { Balance } from "@components/balance/balance";
import { BetSection } from "@components/bottom-bar/bet-section";
import { useModalDialog } from "@hooks/useModalDialog";
import { GameSoundManager } from "@sound-manager";
import { useGameStore } from "@stores";
import { fmt } from "@ui/helpers";

import { GameBridge } from "../../engine/GameBridge";
import { CloseButton } from "./close-button";

// ── Feature definitions

type FeatureKind = "activate" | "buy";

interface Feature {
	id: string;
	kind: FeatureKind;
	title: string;
	bg: string;
	icon: string;
	costMultiplier: number;
	heat: number;
	confirmDesc: string;
}

const FEATURES: Feature[] = [
	{
		id: "super_ante",
		kind: "activate",
		title: "Order Boost",
		bg: "ORDER BOOST",
		icon: "OrderBoostIcon",
		costMultiplier: 3,
		heat: 0.2,
		confirmDesc: "Increased chance to trigger any bonus game."
	},
	{
		id: "fs20",
		kind: "activate",
		title: "Tasting Tray",
		bg: "TASTING TRAY",
		icon: "TastingTrayIcon",
		costMultiplier: 20,
		heat: 0.4,
		confirmDesc: "Each Spin guarantees Multipliers up to 64x that fill the board."
	},
	{
		id: "fs100",
		kind: "activate",
		title: "Feast Mode",
		bg: "FEAST MODE",
		icon: "FeastBoostIcon",
		costMultiplier: 100,
		heat: 0.6,
		confirmDesc: "Each Spin has guaranteed Multipliers across the board."
	},
	{
		id: "std",
		kind: "buy",
		title: "Order Up",
		bg: "ORDER UP",
		icon: "OrderUpIcon",
		costMultiplier: 100,
		heat: 0.35,
		confirmDesc: "8 Free Spins with persistent multiplier cells and increased chances of landing Gloop Symbols!"
	},
	{
		id: "super",
		kind: "buy",
		title: "Main Course",
		bg: "MAIN COURSE",
		icon: "MainCourseIcon",
		costMultiplier: 200,
		heat: 0.7,
		confirmDesc: "10 Free Spins with 1 Guaranteed Super Gloop and persistent multiplier cells."
	},
	{
		id: "mystery",
		kind: "buy",
		title: "Mystery Buy",
		bg: "MYSTERY BUY",
		icon: "MysteryIcon",
		costMultiplier: 500,
		heat: 1.0,
		confirmDesc: "Awards one of the Bonuses with chance to enter the Hidden Final Feast Bonus!"
	}
];

// ── Design tokens ─────────────────────────────────────────────────────────────

const ACT_BG = "linear-gradient(160deg,#2d1a5c 0%,#1a0e35 100%)";
const ACT_BTN = "linear-gradient(135deg,#d93a00,#f1d94f)";
const BUY_BG = "linear-gradient(160deg,#0e2e1a 0%,#071810 100%)";
const BUY_BTN = "linear-gradient(135deg,#1db954,#16963f)";
const CONFIRM_BTN = "linear-gradient(135deg,#00c8e0,#007fa0)";

// ── Overlay / Dialog ──────────────────────────────────────────────────────────

const Overlay = styled.div`
	position: fixed;
	inset: 0;
	z-index: var(--modal-z-index);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: clamp(12px, 3vh, 32px) 20px;
	background: var(--modal-overlay-bg);
	pointer-events: all;
	outline: none;
	overflow-y: auto;

	@media (max-width: 699px) and (orientation: landscape) {
		justify-content: flex-start;
		padding: 8px 12px;
	}
`;

const Dialog = styled.div`
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0;
	width: min(740px, 100%);
`;

const StyledCloseButton = styled(CloseButton)`
	position: absolute;
	top: -8px;
	right: -8px;
	width: 40px;
	height: 40px;
	border-radius: 8px;
	z-index: 2;
`;

const PanelOuter = styled.div`
	position: relative;
	width: 100%;
	padding-top: 38px;
	padding-bottom: 25px;

	@media (orientation: portrait) {
		max-height: 70vh;
		overflow-y: auto;
		padding-right: 4px;
		scrollbar-width: thin;
		scrollbar-color: #3a3a5a transparent;
	}
`;

const DarkBg = styled.div`
	position: absolute;
	top: 28px;
	left: 0;
	right: 0;
	bottom: 0;
	background: #0e0e18;
	border-radius: 12px;
	box-shadow: 0 4px 28px rgba(0, 0, 0, 0.55);
	z-index: 0;
`;

const RowShelf = styled.div`
	position: absolute;
	top: 28px;
	left: 0;
	right: 0;
	height: 70px;
	background: #c8ccd5;
	border-radius: 10px;
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.45),
		0 2px 14px rgba(0, 0, 0, 0.22);
	z-index: 1;
`;

const CardContent = styled.div`
	position: relative;
	z-index: 2;
	padding: 0 25px;
	display: flex;
	flex-direction: column;
	gap: 28px;

	@media (orientation: portrait) {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
		padding: 0 14px;
	}

	@media (max-width: 699px) and (orientation: landscape) {
		padding: 0 12px;
		gap: 16px;
	}
`;

const RowGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px;

	@media (orientation: portrait) {
		display: contents; /* children flow into the 2-col CardContent grid */
	}

	@media (max-width: 699px) and (orientation: landscape) {
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
`;

// ── Card ──────────────────────────────────────────────────────────────────────

const CardWrap = styled.button<{ $kind: FeatureKind; $affordable: boolean }>`
	display: flex;
	flex-direction: column;
	padding: 0;
	border: 3px solid rgba(0, 0, 0, 0.7);
	border-radius: 14px;
	overflow: visible !important;
	cursor: ${p => (p.$affordable ? "pointer" : "not-allowed")};
	opacity: ${p => (p.$affordable ? 1 : 0.5)};
	position: relative;
	text-align: center;
	background: transparent;
	box-shadow:
		0 6px 18px rgba(0, 0, 0, 0.6),
		0 2px 0 rgba(0, 0, 0, 0.8) inset;
	transition:
		transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
		filter 220ms ease,
		box-shadow 220ms ease;

	&::before {
		content: "";
		position: absolute;
		top: -11px;
		left: 50%;
		transform: translateX(-50%);
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #d0d4dd, #9fa4ad);
		border: 2px solid #c8cdd6;
		z-index: 3;
	}

	${p =>
		p.$affordable &&
		css`
			&:hover {
				transform: scale(1.03);
				filter: brightness(1.07);
				box-shadow:
					0 8px 24px rgba(0, 0, 0, 0.7),
					0 2px 0 rgba(0, 0, 0, 0.8) inset;
			}
			&:active {
				transform: scale(1.01);
			}
		`}
`;

const ArtSection = styled.div<{ $kind: FeatureKind }>`
	position: relative;
	width: 100%;
	height: 155px;
	background: ${p => (p.$kind === "activate" ? ACT_BG : BUY_BG)};
	overflow: hidden;
	border-radius: 11px 11px 0 0;
`;

const BgImage = styled.img`
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: center;
	pointer-events: none;
`;

const ArtOverlay = styled.div`
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding: 14px 4px 2px;
	gap: 2px;
	z-index: 2;
`;

const CardTitle = styled.span`
	font-family: "Titan One", sans-serif;
	font-size: clamp(12px, 1.6vw, 15px);
	color: #fff;
	text-align: center;
	text-transform: uppercase;
	letter-spacing: 0.4px;
	text-shadow:
		-1.5px -1.5px 0 #000,
		1.5px -1.5px 0 #000,
		-1.5px 1.5px 0 #000,
		1.5px 1.5px 0 #000;
	flex-shrink: 0;
`;

const CardIcon = styled.img`
	flex: 1;
	min-height: 0;
	width: 100%;
	object-fit: contain;
	pointer-events: none;
	filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
`;

const InfoSection = styled.div`
	background: #d5d9e2;
	padding: 7px 10px 11px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	border-radius: 0 0 11px 11px;
	flex: 1;
`;

const HeatRow = styled.div`
	display: flex;
	align-items: center;
	gap: 5px;
	width: 100%;
`;

const HeatTrack = styled.div`
	flex: 1;
	height: 6px;
	background: rgba(0, 0, 0, 0.15);
	border-radius: 3px;
	overflow: hidden;
`;

const HeatFill = styled.div<{ $w: number; $kind: FeatureKind }>`
	height: 100%;
	width: ${p => p.$w * 100}%;
	border-radius: 3px;
	background: ${p => {
		if (p.$kind === "activate") return "#4caf50";
		if (p.$w < 0.5) return "#ffd600";
		if (p.$w < 0.8) return "#ff9800";
		return "#f44336";
	}};
`;

const Price = styled.span<{ $affordable: boolean; $kind: FeatureKind }>`
	font-family: "Titan One", sans-serif;
	font-size: clamp(14px, 1.9vw, 18px);
	color: ${p => (p.$affordable ? "#ffffff" : "#aaaaaa")};
	line-height: 1;
	-webkit-text-stroke: 1px #000;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
`;

const CTA = styled.span<{ $kind: FeatureKind }>`
	display: block;
	width: 100%;
	padding: 8px 6px;
	border-radius: 9px;
	font-family: "Titan One", sans-serif;
	font-size: clamp(11px, 1.4vw, 14px);
	letter-spacing: 0.5px;
	text-transform: uppercase;
	pointer-events: none;
	-webkit-text-stroke: 1px #000;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	${p =>
		p.$kind === "activate"
			? css`
					background: ${ACT_BTN};
					color: #fff;
				`
			: css`
					background: ${BUY_BTN};
					color: #fff;
				`}
`;

// ── Bottom bar ────────────────────────────────────────────────────────────────

const BottomBar = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 12px 16px;
	box-sizing: border-box;
	background: var(--color-surface);
	border-radius: 0 0 12px 12px;
`;

// ── Confirmation screen ───────────────────────────────────────────────────────

const ConfirmOverlay = styled.div`
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 24px;
	z-index: 1;
`;

const ConfirmCardWrap = styled.div<{ $kind: FeatureKind }>`
	position: relative;
	border: 3px solid rgba(0, 0, 0, 0.7);
	border-radius: 14px;
	overflow: hidden;
	width: min(280px, 80%);
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
`;

const ConfirmArtSection = styled.div<{ $kind: FeatureKind }>`
	position: relative;
	width: 100%;
	height: 160px;
	background: ${p => (p.$kind === "activate" ? ACT_BG : BUY_BG)};
	overflow: hidden;
	border-radius: 11px 11px 0 0;
`;

const ConfirmInfoSection = styled.div`
	background: #d5d9e2;
	padding: 10px 14px 14px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	border-radius: 0 0 11px 11px;
`;

const DescBox = styled.div`
	width: 100%;
	background: rgba(0, 0, 0, 0.22);
	border-radius: 10px;
	padding: 10px 12px;
	box-sizing: border-box;
`;

const ConfirmDesc = styled.p`
	font-family: "Titan One", sans-serif;
	font-size: clamp(11px, 1.3vw, 13px);
	color: #ffffff;
	text-align: center;
	margin: 0;
	line-height: 1.4;
	-webkit-text-stroke: 0.5px rgba(0, 0, 0, 0.6);
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
`;

const ConfirmPrice = styled.span`
	font-family: "Titan One", sans-serif;
	font-size: clamp(18px, 2.5vw, 24px);
	color: #ffffff;
	line-height: 1;
	-webkit-text-stroke: 1px #000;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
`;

const ConfirmBtn = styled.button`
	width: 100%;
	padding: 11px 8px;
	border-radius: 10px;
	border: none;
	background: ${CONFIRM_BTN};
	color: #fff;
	font-family: "Titan One", sans-serif;
	font-size: clamp(13px, 1.6vw, 16px);
	letter-spacing: 0.5px;
	text-transform: uppercase;
	cursor: pointer;
	-webkit-text-stroke: 1px #000;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	box-shadow: 0 3px 10px rgba(0, 180, 220, 0.35);
	transition: filter 160ms ease;
	&:hover {
		filter: brightness(1.1);
	}
`;

const BackBtn = styled.button`
	width: min(280px, 80%);
	padding: 12px;
	border-radius: 10px;
	border: 2px solid rgba(255, 255, 255, 0.2);
	background: rgba(255, 255, 255, 0.1);
	color: #fff;
	font-family: "Titan One", sans-serif;
	font-size: clamp(13px, 1.6vw, 16px);
	letter-spacing: 0.5px;
	text-transform: uppercase;
	cursor: pointer;
	transition: background 160ms ease;
	&:hover {
		background: rgba(255, 255, 255, 0.18);
	}
`;

// ── Component ─────────────────────────────────────────────────────────────────

interface BonusModalProps {
	open: boolean;
	onClose: () => void;
}

const BonusModal = ({ open, onClose }: BonusModalProps) => {
	const overlayRef = useModalDialog<HTMLDivElement>(open);
	const titleId = useId();
	const bet = useGameStore(s => s.bet);
	const balance = useGameStore(s => s.balance);
	const [pending, setPending] = useState<string | null>(null);
	const [confirming, setConfirming] = useState<Feature | null>(null);
	const [wasOpen, setWasOpen] = useState(open);
	const sound = GameSoundManager.getInstance();

	// Reset selection each time the modal opens (render-time reset, not an effect).
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setPending(null);
			setConfirming(null);
		}
	}

	useEffect(() => {
		GameBridge.getInstance().setHudVisible(!open);
	}, [open]);

	const close = useCallback(() => {
		sound.cue("featuresOpen");
		onClose();
	}, [onClose, sound]);

	if (!open) return null;

	const handleSelect = (feature: Feature, price: number) => {
		if (price > balance || pending) return;
		//sound.cue("hover");
		setConfirming(feature);
	};

	const handleConfirm = () => {
		if (!confirming || pending) return;
		const price = confirming.costMultiplier * bet;
		if (price > balance) return;
		setPending(confirming.id);
		GameBridge.getInstance().buyFeature(confirming.id);
		close();
	};

	return createPortal(
		<Overlay
			ref={overlayRef}
			onClick={confirming ? undefined : close}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabIndex={-1}
		>
			<Dialog onClick={e => e.stopPropagation()}>
				{!confirming && (
					<StyledCloseButton
						onClick={e => {
							e.stopPropagation();
							close();
						}}
					/>
				)}

				{confirming ? (
					/* ── Confirmation screen ── */
					<ConfirmOverlay>
						<ConfirmCardWrap $kind={confirming.kind}>
							<ConfirmArtSection $kind={confirming.kind}>
								<BgImage src={`/bonusBuy/${confirming.bg}.png`} alt="" draggable={false} />
								<ArtOverlay>
									<CardTitle>{confirming.title}</CardTitle>
									<CardIcon src={`/bonusBuy/${confirming.icon}.png`} alt={confirming.title} draggable={false} />
								</ArtOverlay>
							</ConfirmArtSection>

							<ConfirmInfoSection>
								<HeatRow>
									<span style={{ fontSize: 14, lineHeight: 1 }}>🔥</span>
									<HeatTrack>
										<HeatFill $w={confirming.heat} $kind={confirming.kind} />
									</HeatTrack>
								</HeatRow>
								<DescBox>
									<ConfirmDesc>{confirming.confirmDesc}</ConfirmDesc>
								</DescBox>
								<ConfirmPrice>{fmt(confirming.costMultiplier * bet)}</ConfirmPrice>
								<ConfirmBtn onClick={handleConfirm} disabled={pending !== null}>
									Confirm
								</ConfirmBtn>
							</ConfirmInfoSection>
						</ConfirmCardWrap>
						<BackBtn onClick={() => setConfirming(null)}>← Back</BackBtn>
					</ConfirmOverlay>
				) : (
					/* ── Card grid ── */
					<PanelOuter>
						<DarkBg />
						<RowShelf />
						<CardContent>
							{(["activate", "buy"] as FeatureKind[]).map(kind => (
								<RowGrid key={kind}>
									{FEATURES.filter(f => f.kind === kind).map(feature => {
										const price = feature.costMultiplier * bet;
										const affordable = price <= balance;
										const label = kind === "activate" ? "Activate" : "Buy";
										return (
											<CardWrap
												key={feature.id}
												type="button"
												$kind={feature.kind}
												$affordable={affordable}
												disabled={!affordable || pending !== null}
												aria-label={`${feature.title} — ${fmt(price)}`}
												onMouseEnter={() => affordable && sound.cue("hover")}
												onClick={() => handleSelect(feature, price)}
											>
												<ArtSection $kind={feature.kind}>
													<BgImage src={`/bonusBuy/${feature.bg}.png`} alt="" draggable={false} />
													<ArtOverlay>
														<CardTitle>{feature.title}</CardTitle>
														<CardIcon src={`/bonusBuy/${feature.icon}.png`} alt={feature.title} draggable={false} />
													</ArtOverlay>
												</ArtSection>
												<InfoSection>
													<HeatRow>
														<span style={{ fontSize: 13, lineHeight: 1 }}>🔥</span>
														<HeatTrack>
															<HeatFill $w={feature.heat} $kind={feature.kind} />
														</HeatTrack>
													</HeatRow>
													<Price $affordable={affordable} $kind={feature.kind}>
														{fmt(price)}
													</Price>
													<CTA $kind={feature.kind}>{label}</CTA>
												</InfoSection>
											</CardWrap>
										);
									})}
								</RowGrid>
							))}
						</CardContent>
					</PanelOuter>
				)}

				{!confirming && (
					<BottomBar>
						<Balance />
						<BetSection />
					</BottomBar>
				)}
			</Dialog>
		</Overlay>,
		document.body
	);
};

export { BonusModal };
