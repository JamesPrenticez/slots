import type { WinPresentationCommandScenario } from "../common/commands/win/WinPresentationCommand.js";
import type { Command, OnCompleteArgument } from "./Command.js";

/**
 * Controller — base class for anything that executes Commands.
 *
 * Both the game controller (SlotMachineController) and Command objects
 * themselves extend this class. Commands extend it so they can execute
 * sub-commands — for example StopSpinCommand executes one StopReelCommand
 * per reel and waits for each one's onCompleted before firing the next.
 *
 * The pattern works like a chain of responsibility:
 *   - executeCommand() runs a command and stores it as lastCommand
 *   - onCompletedCommand() is called back when the command finishes,
 *     letting the controller decide what to run next
 *   - executeCommandWithoutTrace() runs a command that should not be
 *     visible to the cancel system — used for housekeeping steps like
 *     checking free round state that shouldn't be quickstoppable
 */
export abstract class Controller {
	protected lastCommand?: Command;

	public onCompletedCommand(
		command: Command,
		value?: OnCompleteArgument,
		scenario?: WinPresentationCommandScenario
	): void {
		if (import.meta.env.DEV) {
			console.log(" CommandCompleted", command.constructor.name, command.name, value, scenario);
		}
	}

	/**
	 * Runs the command, stores it as lastCommand, and awaits completion.
	 * lastCommand is used by cancel logic — when the player quickstops,
	 * we call lastCommand.cancel() to interrupt whatever is running.
	 */
	public async executeCommand(command: Command): Promise<void> {
		this.lastCommand = command;
		command.setController(this);
		if (import.meta.env.DEV) {
			// console.log("CommandExecuted", command.constructor.name, command.name);
		}
		await command.execute();
	}

	/**
	 * Runs the command without updating lastCommand.
	 * Used for steps that should be invisible to cancel — e.g. OpenGameCommand
	 * which runs on boot and should not be cancellable by a quickstop.
	 */
	public async executeCommandWithoutTrace(command: Command): Promise<void> {
		command.setController(this);
		if (import.meta.env.DEV) {
			// console.log("CommandWithoutTrace", command.constructor.name, command.name);
		}
		await command.execute();
	}
}
