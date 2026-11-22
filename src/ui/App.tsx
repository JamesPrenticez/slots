import { useEffect, useState } from "react";

import { DebugMenu } from "@components/debug-menu/debug-menu";
import { Hud } from "@components/hud";
import { ModalHost } from "@components/modals/modal-host";

import { getGameController } from "../demoslot";
import { GameBridge } from "../engine/GameBridge";
import { PixiCanvas } from "./PixiCanvas";

import "./theme.css";
import "./App.css";

/**
 * Controller is instantiated at module scope — before any JSX renders.
 * This guarantees CoreController.getInstance() is valid when PixiCanvas
 * calls onReady() after FanfareBaseSlotApplication.init() resolves.
 */
const controller = getGameController();

export function App() {
	const [hudVisible, setHudVisible] = useState(true);

	useEffect(() => {
		GameBridge.getInstance().registerHudVisibilityHandler(setHudVisible);
	}, []);

	return (
		<div className="game-root">
			<PixiCanvas background={0x0a0a0a} onReady={() => controller.onRootCreated()} />
			<div
				style={{
					visibility: hudVisible ? "visible" : "hidden",
					pointerEvents: hudVisible ? "auto" : "none"
				}}
			>
				<Hud />
			</div>
			<ModalHost />
			{import.meta.env.DEV && <DebugMenu />}
		</div>
	);
}
