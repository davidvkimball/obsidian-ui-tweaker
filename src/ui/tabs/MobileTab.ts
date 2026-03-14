import { SettingGroup, Setting } from "obsidian";
/**
 * Mobile Tab - All mobile-specific settings
 */

import { TabRenderer } from '../common/TabRenderer';

import { CommandPickerModal } from '../../modals/CommandPickerModal';
import { IconPickerModal } from '../../modals/IconPickerModal';
import { UISettings } from '../../settings';

// MOCKED: SettingsContainer type
type SettingsContainer = { addSetting: (cb: (setting: Setting) => void) => void };

export class MobileTab extends TabRenderer {
	render(container: HTMLElement): void {
		container.empty();

		this.renderResetButton(container, [
			'mobileChevronsIcon', 'navigateBackButton', 'navigateForwardButton', 'quickSwitcherButton',
			'mobileNewTabButton', 'openTabButton', 'ribbonMenuButton', 'swapMobileNewTabIcon',
			'hideMobileTitle', 'hideMobileSyncIcon', 'hideStatusBarMobile', 'syncButtonReplacement',
			'navigateButtonPosition', 'navigationButtonPosition', 'quickSwitcherPosition',
			'newTabPosition', 'openTabsPosition', 'ribbonMenuPosition'
		]);

		// ========================================
		// Mobile
		// ========================================
		const mobileGroup = new SettingGroup(container);

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
		this.addToggleSetting(mobileGroup, 'Hide status bar', 'Hide the status bar on mobile devices.', 'hideStatusBarMobile');

		// Replace sync button with custom action
		this.renderSyncButtonReplacement(container, mobileGroup);

		// ========================================
		// Mobile navigation menu
		// ========================================
		const mobileNavGroup = new SettingGroup(container).setHeading('Mobile navigation menu');

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
				.addToggle(toggle =>
					toggle.setValue(Boolean(this.getSettings()[key])).onChange(value => {
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
				.addDropdown(dropdown => {
					for (let i = 1; i <= 6; i++) {
						dropdown.addOption(String(i), String(i));
					}
					const currentValue = this.getSettings()[key];
					const stringValue = typeof currentValue === 'string' ? currentValue : '1';
					dropdown.setValue(stringValue).onChange(value => {
						(this.getSettings()[key] as string) = value;
						void this.saveSettings();
					});
				});
		});
	}

	private renderSyncButtonReplacement(container: HTMLElement, group: SettingsContainer): void {
		const settings = this.getSettings();
		if (!settings.syncButtonReplacement) {
			settings.syncButtonReplacement = {
				enabled: false,
				commandId: 'ui-tweaker:open-settings',
				iconId: 'wrench',
			};
		}

		const dependentSettings: HTMLElement[] = [];

		group.addSetting((setting): void => {
			setting
				.setName('Replace sync button with custom action')
				.setDesc('Replace the sync button in the mobile sidebar with a custom icon and command. This will hide the original sync button and show your custom button instead.')
				.addToggle(toggle =>
					toggle.setValue(settings.syncButtonReplacement.enabled).onChange(value => {
						settings.syncButtonReplacement.enabled = value;

						// Toggle visibility of dependent settings instantly
						dependentSettings.forEach(el => {
							el.style.display = value ? '' : 'none';
						});

						void this.saveSettings();
					})
				);
		});

		const getCommandName = (commandId: string): string => {
			if (!commandId) return 'Select command...';

			try {
				const commandRegistry = (this.app as { commands?: { listCommands?: () => Array<{ id: string; name: string }> } }).commands;
				if (commandRegistry && typeof commandRegistry.listCommands === 'function') {
					const commands = commandRegistry.listCommands();
					const command = commands.find((cmd) => cmd && cmd.id === commandId);
					if (command?.name) {
						return command.name;
					}
				}
			} catch {
				// Error getting command name
			}
			return 'Select command...';
		};

		const getIconName = (iconId: string): string => {
			if (!iconId) return '';
			return iconId
				.replace(/^lucide-/, '')
				.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		};

		// Command Setting
		group.addSetting((setting): void => {
			dependentSettings.push(setting.settingEl);
			setting.settingEl.style.display = settings.syncButtonReplacement.enabled ? '' : 'none';

			setting
				.setName('Command')
				.setDesc('Select the command to execute when the button is clicked')
				.addButton(button =>
					button.setButtonText(getCommandName(settings.syncButtonReplacement.commandId)).onClick(() => {
						const modal = new CommandPickerModal(this.app, (commandId) => {
							settings.syncButtonReplacement.commandId = commandId;
							button.setButtonText(getCommandName(commandId));
							void this.saveSettings();
						});
						modal.open();
					})
				);
		});

		// Icon Setting
		group.addSetting((setting): void => {
			dependentSettings.push(setting.settingEl);
			setting.settingEl.style.display = settings.syncButtonReplacement.enabled ? '' : 'none';

			setting
				.setName('Icon')
				.setDesc('Select the icon to display on the button')
				.addButton(button =>
					button.setButtonText(getIconName(settings.syncButtonReplacement.iconId) || 'Select icon...').onClick(() => {
						const modal = new IconPickerModal(this.app, (iconId) => {
							settings.syncButtonReplacement.iconId = iconId;
							button.setButtonText(getIconName(iconId));
							void this.saveSettings();
						});
						modal.open();
					})
				);
		});
	}
}
