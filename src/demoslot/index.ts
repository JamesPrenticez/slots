/**
 * DemoSlot — game entry point.
 *
 * Import this in App.tsx before <PixiCanvas> mounts.
 * Instantiates FanfareBaseSlotController as the CoreController singleton.
 */
import { FanfareBaseSlotController } from "./controllers/FanfareBaseSlotController.js";

export function getGameController(): FanfareBaseSlotController {
	return FanfareBaseSlotController.getInstance();
}
