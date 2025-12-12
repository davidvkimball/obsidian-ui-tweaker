/**
 * Command Picker Modal
 * Searchable modal for selecting an Obsidian command
 */

import { App, FuzzySuggestModal } from 'obsidian';

interface CommandOption {
	id: string;
	name: string;
}

export class CommandPickerModal extends FuzzySuggestModal<CommandOption> {
	private onSelect: (commandId: string) => void;

	constructor(app: App, onSelect: (commandId: string) => void) {
		super(app);
		this.onSelect = onSelect;
	}

	getItems(): CommandOption[] {
		const commandRegistry = (this.app as { commands?: { listCommands?: () => CommandOption[] } }).commands;
		const commandMap = new Map<string, CommandOption>();

		if (commandRegistry && typeof commandRegistry.listCommands === 'function') {
			try {
				const commands = commandRegistry.listCommands();
				for (const command of commands) {
					if (command && command.id && command.name && !commandMap.has(command.id)) {
						commandMap.set(command.id, {
							id: command.id,
							name: command.name,
						});
					}
				}
			} catch (e) {
				console.warn('[UI Tweaker] Error getting commands:', e);
			}
		}

		return Array.from(commandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
	}

	getItemText(item: CommandOption): string {
		return item.name;
	}

	onChooseItem(item: CommandOption): void {
		this.onSelect(item.id);
	}
}

