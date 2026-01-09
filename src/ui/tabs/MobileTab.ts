/**
 * Mobile Tab - All mobile-specific settings
 */

import { TabRenderer } from '../common/TabRenderer';
import { createSettingsGroup, SettingsContainer } from '../../utils/settings-compat';
import { CommandPickerModal } from '../../modals/CommandPickerModal';
import { IconPickerModal } from '../../modals/IconPickerModal';
import { UISettings } from '../../settings';

export class MobileTab extends TabRenderer {
	render(container: HTMLElement): void {
		// ========================================
		// Mobile
		// ========================================
		const mobileGroup = createSettingsGroup(container, 'Mobile', 'ui-tweaker');

		this.addToggleSetting(mobileGroup, 'Hide "Mobile chevrons" icon', 'Hide "Mobile chevrons" icon (long-press flair) in mobile navbar.', 'mobileChevronsIcon');

		this.addToggleSetting(mobileGroup, 'Hide "Navigate back" button', 'Hide "Navigate back" button in mobile navbar.', 'navigateBackButton');

		this.addToggleSetting(mobileGroup, 'Hide "Navigate forward" button', 'Hide "Navigate forward" button in mobile navbar.', 'navigateForwardButton');

		this.addToggleSetting(mobileGroup, 'Hide "Quick switcher" button', 'Hide "Quick switcher" button in mobile navbar.', 'quickSwitcherButton');

		this.addToggleSetting(mobileGroup, 'Hide "New tab" button', 'Hide "New tab" button in mobile navbar.', 'mobileNewTabButton');

		this.addToggleSetting(mobileGroup, 'Hide "Open tabs" button', 'Hide "Open tabs" button in mobile navbar.', 'openTabButton');

		this.addToggleSetting(mobileGroup, 'Hide "Ribbon menu" button', 'Hide "Ribbon menu" button in mobile navbar.', 'ribbonMenuButton');

		// Swap button icon
		this.addToggleSetting(mobileGroup, 'Swap mobile new tab icon', 'Replace the new tab plus icon with a home button icon in mobile navbar.', 'swapMobileNewTabIcon');

		this.addToggleSetting(mobileGroup, 'Hide title', 'Hide the title in mobile view headers.', 'hideMobileTitle');

		this.addToggleSetting(mobileGroup, 'Hide sync icon', 'Hide sync status icons in mobile interface.', 'hideMobileSyncIcon');

		// Replace sync button with custom action
		this.renderSyncButtonReplacement(mobileGroup);

		// ========================================
		// Mobile navigation menu
		// ========================================
		const mobileNavGroup = createSettingsGroup(container, 'Mobile navigation menu', 'ui-tweaker');

		this.addPositionSetting(mobileNavGroup, '"Navigate back" button position', 'Select the position for the "Navigate back" button (default 1).', 'navigateButtonPosition');

		this.addPositionSetting(mobileNavGroup, '"Navigate forward" button position', 'Select the position for the "Navigate forward" button (default 2).', 'navigationButtonPosition');

		this.addPositionSetting(mobileNavGroup, '"Quick switcher" button position', 'Select the position for the "Quick switcher" button (default 3).', 'quickSwitcherPosition');

		this.addPositionSetting(mobileNavGroup, '"New tab" button position', 'Select the position for the "New tab" button (default 4).', 'newTabPosition');

		this.addPositionSetting(mobileNavGroup, '"Open tabs" button position', 'Select the position for the "Open tabs" button (default 5).', 'openTabsPosition');

		this.addPositionSetting(mobileNavGroup, '"Ribbon menu" button position', 'Select the position for the "Ribbon menu" button (default 6).', 'ribbonMenuPosition');
	}

	private addToggleSetting(group: SettingsContainer, name: string, desc: string, key: keyof UISettings) {
		group.addSetting((setting): void => {
			setting
				.setName(name)
				.setDesc(desc)
				.addToggle((toggle) =>
					toggle.setValue(Boolean(this.getSettings()[key])).onChange((value) => {
						(this.getSettings()[key] as boolean) = value;
						void this.saveSettings();
					})
				);
		});
	}

	private addPositionSetting(group: SettingsContainer, name: string, desc: string, key: keyof UISettings) {
		group.addSetting((setting): void => {
			setting
				.setName(name)
				.setDesc(desc)
				.addDropdown((dropdown) => {
					for (let i = 1; i <= 6; i++) {
						dropdown.addOption(String(i), String(i));
					}
					const currentValue = this.getSettings()[key];
					const stringValue = typeof currentValue === 'string' ? currentValue : '1';
					dropdown.setValue(stringValue).onChange((value) => {
						(this.getSettings()[key] as string) = value;
						void this.saveSettings();
					});
				});
		});
	}

	private renderSyncButtonReplacement(group: SettingsContainer): void {
		const settings = this.getSettings();
		if (!settings.syncButtonReplacement) {
			settings.syncButtonReplacement = {
				enabled: false,
				commandId: 'open-settings',
				iconId: 'wrench',
			};
		}

		group.addSetting((setting): void => {
			setting
				.setName('Replace sync button with custom action')
				.setDesc('Replace the sync button in the mobile sidebar with a custom icon and command. This will hide the original sync button and show your custom button instead.')
				.addToggle((toggle) =>
					toggle.setValue(settings.syncButtonReplacement.enabled).onChange((value) => {
						if (!settings.syncButtonReplacement) {
							settings.syncButtonReplacement = {
								enabled: true,
								commandId: '',
								iconId: 'wrench',
							};
						}
						settings.syncButtonReplacement.enabled = value;
						void this.saveSettings();
					})
				);
		});

		// Show command and icon pickers only if replacement is enabled
		if (settings.syncButtonReplacement.enabled) {
			const getCommandName = (commandId: string): string => {
				if (!commandId) return 'Select command...';
				
				try {
					const commandRegistry = (this.app as { commands?: { listCommands?: () => Array<{ id: string; name: string }> } }).commands;
					if (commandRegistry && typeof commandRegistry.listCommands === 'function') {
						const commands = commandRegistry.listCommands();
						const command = commands.find((cmd) => 
							cmd && cmd.name && (
								cmd.id === commandId || 
								cmd.id === commandId.replace(/^ui-tweaker:+/g, '') ||
								cmd.id === `ui-tweaker:${commandId.replace(/^ui-tweaker:+/g, '')}`
							)
						);
						if (command?.name) {
							return command.name;
						}
					}
				} catch {
					// Error getting command name
				}
				return 'Select command...';
			};

			const commandName = getCommandName(settings.syncButtonReplacement.commandId);
			group.addSetting((setting): void => {
				setting
					.setName('Command')
					.setDesc('Select the command to execute when the button is clicked')
					.addButton((button) =>
						button.setButtonText(commandName || 'Select command...').onClick(() => {
							const modal = new CommandPickerModal(this.app, (commandId) => {
								if (!settings.syncButtonReplacement) {
									settings.syncButtonReplacement = {
										enabled: true,
										commandId: '',
										iconId: 'wrench',
									};
								}
								settings.syncButtonReplacement.commandId = commandId;
								void this.saveSettings();
							});
							modal.open();
						})
					);
			});

			const getIconName = (iconId: string): string => {
				if (!iconId) return '';
				return iconId
					.replace(/^lucide-/, '')
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
			};

			const iconName = getIconName(settings.syncButtonReplacement.iconId);
			group.addSetting((setting): void => {
				setting
					.setName('Icon')
					.setDesc('Select the icon to display on the button')
					.addButton((button) =>
						button.setButtonText(iconName || 'Select icon...').onClick(() => {
							const modal = new IconPickerModal(this.app, (iconId) => {
								if (!settings.syncButtonReplacement) {
									settings.syncButtonReplacement = {
										enabled: true,
										commandId: 'open-settings',
										iconId: 'wrench',
									};
								}
								settings.syncButtonReplacement.iconId = iconId;
								void this.saveSettings();
							});
							modal.open();
						})
					);
			});
		}
	}
}
