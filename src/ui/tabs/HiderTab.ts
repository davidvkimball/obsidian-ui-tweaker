/**
 * Hider Tab - Auto-hide and visibility settings (excluding mobile and explorer buttons)
 */

import { TabRenderer } from '../common/TabRenderer';
import { createSettingsGroup, SettingsContainer } from '../../utils/settings-compat';
import { CommandPickerModal } from '../../modals/CommandPickerModal';
import { IconPickerModal } from '../../modals/IconPickerModal';
import { UISettings } from '../../settings';
import { UIVisibilityState } from '../../types';

export class HiderTab extends TabRenderer {
	render(container: HTMLElement): void {
		// ========================================
		// Auto-hide elements
		// ========================================
		const generalGroup = createSettingsGroup(container, undefined, 'ui-tweaker');

		this.addVisibilitySetting(
			generalGroup,
			'Title bar',
			'Hide title bar until hover. Turn off to always show.',
			'titleBar'
		);

		this.addVisibilitySetting(
			generalGroup,
			'File explorer nav header',
			'Hide file explorer navigation header until hover. Elegantly reveals on hover.',
			'fileExplorerNavHeader'
		);

		this.addVisibilitySetting(
			generalGroup,
			'Other nav headers',
			'Hide navigation headers for tag, backlinks, outgoing links, outline, and bookmarks panes until hover.',
			'otherNavHeaders'
		);

		this.addVisibilitySetting(
			generalGroup,
			'Left tab headers',
			'Hide left panel tab headers until hover. Elegantly reveals on hover.',
			'leftTabHeaders'
		);

		this.addVisibilitySetting(
			generalGroup,
			'Right tab headers',
			'Hide right panel tab headers until hover. Elegantly reveals on hover.',
			'rightTabHeaders'
		);

		// Ribbon - boolean toggle
		generalGroup.addSetting((setting): void => {
			setting
				.setName('Collapse ribbon')
				.setDesc('Collapse the left ribbon to a thin strip until hover. Elegantly expands on hover.')
				.addToggle((toggle) =>
					toggle.setValue(this.getSettings().ribbonRevealOnHover).onChange((value) => {
						this.getSettings().ribbonRevealOnHover = value;
						void this.saveSettings();
					})
				);
		});

		// ========================================
		// Navigation
		// ========================================
		const navigationGroup = createSettingsGroup(container, 'Navigation', 'ui-tweaker');

		this.addToggleSetting(navigationGroup, 'Hide tab bar', 'Hides the tab container at the top of the window.', 'tabBar');

		this.addToggleSetting(navigationGroup, 'Make top of window draggable without tab bar', 'Enables window dragging from the top of the window when the tab bar is hidden. Only works when "Hide tab bar" is enabled.', 'enableWindowDragging');

		// Note: Explorer button toggles (newNoteButton, newFolderButton, etc.) moved to Explorer tab
		// View header buttons stay here
		this.addToggleSetting(navigationGroup, 'Hide "Reading mode" button', 'Hide "Reading mode" button in view headers.', 'readingModeButton');

		this.addToggleSetting(navigationGroup, 'Hide "Search settings" button', 'Hide "Search settings" button in search pane.', 'searchSettingsButton');

		// ========================================
		// Vault profile area
		// ========================================
		const vaultProfileGroup = createSettingsGroup(container, 'Vault profile area', 'ui-tweaker');

		this.addVisibilitySetting(
			vaultProfileGroup,
			'Vault switcher',
			'Hide vault switcher until hover. Does not work when vault name is hidden.',
			'vaultSwitcher'
		);

		this.addVisibilitySetting(
			vaultProfileGroup,
			'Help button',
			'Hide help button until hover. Elegantly reveals on hover.',
			'helpButton'
		);

		// Replace help button with custom action
		this.renderHelpButtonReplacement(vaultProfileGroup);

		this.addVisibilitySetting(
			vaultProfileGroup,
			'Settings button',
			'Hide settings button until hover. Elegantly reveals on hover.',
			'settingsButton'
		);

		vaultProfileGroup.addSetting((setting): void => {
			setting
				.setName('Vault switcher background transparency')
				.setDesc('Adjust the transparency of the vault switcher background when hidden. Range: 0 (fully transparent) to 1 (fully opaque).')
				.addSlider((slider) =>
					slider
						.setLimits(0, 1, 0.01)
						.setValue(this.getSettings().vaultSwitcherBackgroundTransparency)
						.setDynamicTooltip()
						.onChange((value) => {
							this.getSettings().vaultSwitcherBackgroundTransparency = value;
							void this.saveSettings();
						})
				);
		});

		// ========================================
		// Tab icons
		// ========================================
		const tabIconsGroup = createSettingsGroup(container, 'Tab icons', 'ui-tweaker');

		this.addVisibilitySetting(
			tabIconsGroup,
			'Hide tab list icon',
			'Hides the tab list icon. You can still access tabs via other methods.',
			'tabListIcon'
		);

		this.addVisibilitySetting(
			tabIconsGroup,
			'Hide new tab icon',
			'Hides the new tab icon. You can still create new tabs with Ctrl+T (Cmd+T on Mac).',
			'newTabIcon'
		);

		this.addVisibilitySetting(
			tabIconsGroup,
			'Hide tab close button',
			'Hides the close button on tabs. You can still close tabs with middle click or other methods.',
			'tabCloseButton'
		);

		// ========================================
		// Status & UI elements
		// ========================================
		const statusUIGroup = createSettingsGroup(container, 'Status & UI elements', 'ui-tweaker');

		this.addToggleSetting(statusUIGroup, 'Hide status bar', 'Hides word count, character count and backlink count.', 'statusBar');

		this.addVisibilitySetting(
			statusUIGroup,
			'Scroll bars',
			'Control scrollbar visibility. Reveal option hides scrollbars until hover.',
			'scrollBars'
		);

		this.addVisibilitySetting(
			statusUIGroup,
			'Hide left sidebar toggle button',
			'Hides the left sidebar toggle button.',
			'leftSidebarToggleButton'
		);

		this.addVisibilitySetting(
			statusUIGroup,
			'Hide right sidebar toggle button',
			'Hides the right sidebar toggle button.',
			'rightSidebarToggleButton'
		);

		this.addToggleSetting(statusUIGroup, 'Hide tooltips', 'Hides all tooltips.', 'tooltips');

		this.addToggleSetting(statusUIGroup, 'Hide instructions', 'Hides instructional tips in modals.', 'instructions');

		// ========================================
		// Search
		// ========================================
		const searchGroup = createSettingsGroup(container, 'Search', 'ui-tweaker');

		this.addToggleSetting(searchGroup, 'Hide search suggestions', 'Hides suggestions in search pane.', 'searchSuggestions');

		this.addToggleSetting(searchGroup, 'Hide count of search term matches', 'Hides the number of matches within each search result.', 'searchTermCounts');

		// ========================================
		// Properties
		// ========================================
		const propertiesGroup = createSettingsGroup(container, 'Properties', 'ui-tweaker');

		this.addToggleSetting(propertiesGroup, 'Hide properties in Reading view', 'Hides the properties section in Reading view.', 'propertiesInReadingView');

		this.addToggleSetting(propertiesGroup, 'Hide properties heading', 'Hide "Properties" heading above properties.', 'propertiesInHeading');

		this.addToggleSetting(propertiesGroup, 'Hide "Add property" button', 'Hide "Add property" button below properties.', 'addPropertyButton');
	}

	private addVisibilitySetting(group: SettingsContainer, name: string, desc: string, key: keyof UISettings) {
		group.addSetting((setting): void => {
			setting
				.setName(name)
				.setDesc(desc)
				.addDropdown((dropdown) => {
					const currentValue = this.getSettings()[key];
					const stringValue = typeof currentValue === 'string' ? currentValue : 'show';
					dropdown
						.addOption('show', 'Show')
						.addOption('hide', 'Hide')
						.addOption('reveal', 'Reveal')
						.setValue(stringValue)
						.onChange((value) => {
							(this.getSettings()[key] as UIVisibilityState) = value as UIVisibilityState;
							void this.saveSettings();
						});
				});
		});
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

	private renderHelpButtonReplacement(group: SettingsContainer): void {
		const settings = this.getSettings();
		if (!settings.helpButtonReplacement) {
			settings.helpButtonReplacement = {
				enabled: false,
				commandId: '',
				iconId: 'wrench',
			};
		}

		group.addSetting((setting): void => {
			setting
				.setName('Replace help button with custom action')
				.setDesc('Replace the help button with a custom icon and command. This will hide the original help button and show your custom button instead.')
				.addToggle((toggle) =>
					toggle.setValue(settings.helpButtonReplacement.enabled).onChange((value) => {
						if (!settings.helpButtonReplacement) {
							settings.helpButtonReplacement = {
								enabled: true,
								commandId: '',
								iconId: 'wrench',
							};
						}
						settings.helpButtonReplacement.enabled = value;
						void this.saveSettings();
					})
				);
		});

		// Show command and icon pickers only if replacement is enabled
		if (settings.helpButtonReplacement.enabled) {
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

			const commandName = getCommandName(settings.helpButtonReplacement.commandId);
			group.addSetting((setting): void => {
				setting
					.setName('Command')
					.setDesc('Select the command to execute when the button is clicked')
					.addButton((button) =>
						button.setButtonText(commandName || 'Select command...').onClick(() => {
							const modal = new CommandPickerModal(this.app, (commandId) => {
								if (!settings.helpButtonReplacement) {
									settings.helpButtonReplacement = {
										enabled: true,
										commandId: '',
										iconId: 'wrench',
									};
								}
								settings.helpButtonReplacement.commandId = commandId;
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

			const iconName = getIconName(settings.helpButtonReplacement.iconId);
			group.addSetting((setting): void => {
				setting
					.setName('Icon')
					.setDesc('Select the icon to display on the button')
					.addButton((button) =>
						button.setButtonText(iconName || 'Select icon...').onClick(() => {
							const modal = new IconPickerModal(this.app, (iconId) => {
								if (!settings.helpButtonReplacement) {
									settings.helpButtonReplacement = {
										enabled: true,
										commandId: 'open-settings',
										iconId: 'wrench',
									};
								}
								settings.helpButtonReplacement.iconId = iconId;
								void this.saveSettings();
							});
							modal.open();
						})
					);
			});
		}
	}
}
