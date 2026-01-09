/**
 * Helper function to choose a new command (similar to Commander's chooseNewCommand)
 */

import { Command } from 'obsidian';
import UITweakerPlugin from '../main';
import { CommandIconPair } from '../types';
import { CommandPickerModal } from '../modals/CommandPickerModal';
import { IconPickerModal } from '../modals/IconPickerModal';
import { NamePickerModal } from '../modals/NamePickerModal';

export async function chooseNewCommand(plugin: UITweakerPlugin): Promise<CommandIconPair> {
	return new Promise((resolve, reject) => {
		let commandSelected = false;
		let iconSelected = false;
		
		// Step 1: Choose command
		const commandModal = new CommandPickerModal(plugin.app, (commandId) => {
			commandSelected = true;
			
			// Get command to check if it has an icon
			const commands = (plugin.app as { commands?: { commands?: { [id: string]: Command } } }).commands;
			const command = commands?.commands?.[commandId];
			
			// Close command modal first
			setTimeout(() => {
				commandModal.close();
			}, 0);
			
			// Always show icon picker (even if command has an icon, let user choose)
			const displayName = command?.name || 'Custom Command';
			const iconModal = new IconPickerModal(plugin.app, (iconId) => {
				iconSelected = true;
				iconModal.close();
				
				// Step 3: Choose custom name
				setTimeout(() => {
					let nameSelected = false;
					const nameModal = new NamePickerModal(plugin.app, displayName, (customName) => {
						nameSelected = true;
						nameModal.close();
						
						resolve({
							id: commandId,
							icon: iconId,
							name: customName,
							displayName: displayName,
							mode: 'any',
							mdOnly: false,
						});
					});
					
					nameModal.onClose = () => {
						setTimeout(() => {
							if (!nameSelected && iconSelected && commandSelected) {
								reject(new Error('No name selected'));
							}
						}, 0);
					};
					
					nameModal.open();
				}, 100);
			});
			
			iconModal.onClose = () => {
				// Use setTimeout to allow onSelect to set iconSelected first
				setTimeout(() => {
					if (!iconSelected && commandSelected) {
						reject(new Error('No icon selected'));
					}
				}, 0);
			};
			
			setTimeout(() => {
				iconModal.open();
			}, 100);
		});
		
		commandModal.onClose = () => {
			// Use setTimeout to allow onChooseItem to set commandSelected first
			setTimeout(() => {
				if (!commandSelected) {
					reject(new Error('No command selected'));
				}
			}, 0);
		};
		
		commandModal.open();
	});
}
