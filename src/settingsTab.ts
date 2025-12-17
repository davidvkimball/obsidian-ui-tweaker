/**
 * Settings Tab - UI implementation
 */

import { App, PluginSettingTab } from 'obsidian';
import { UISettings } from './settings';
import { UIVisibilityState } from './types';
import { CommandPickerModal } from './modals/CommandPickerModal';
import { IconPickerModal } from './modals/IconPickerModal';
import UITweakerPlugin from './main';
import { createSettingsGroup, SettingsContainer } from './utils/settings-compat';

export class UITweakerSettingTab extends PluginSettingTab {
	plugin: UITweakerPlugin;

	constructor(app: App, plugin: UITweakerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ========================================
		// Auto-hide elements
		// ========================================
		const generalGroup = createSettingsGroup(containerEl);

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
		generalGroup.addSetting((setting) =>
			setting
				.setName('Collapse ribbon')
				.setDesc('Collapse the left ribbon to a thin strip until hover. Elegantly expands on hover.')
				.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.ribbonRevealOnHover).onChange((value) => {
					this.plugin.settings.ribbonRevealOnHover = value;
					void (async () => {
						await this.plugin.saveSettings();
					})();
					this.plugin.refresh();
				})
				)
		);

		// ========================================
		// Navigation
		// ========================================
		const navigationGroup = createSettingsGroup(containerEl, 'Navigation');

		this.addToggleSetting(navigationGroup, 'Hide tab bar', 'Hides the tab container at the top of the window.', 'tabBar');

		this.addToggleSetting(navigationGroup, 'Make top of window draggable without tab bar', 'Enables window dragging from the top of the window when the tab bar is hidden. Only works when "Hide tab bar" is enabled.', 'enableWindowDragging');

		this.addToggleSetting(navigationGroup, 'Hide "New note" button', 'Hide "New note" button in navigation headers.', 'newNoteButton');

		this.addToggleSetting(navigationGroup, 'Hide "New folder" button', 'Hide "New folder" button in navigation headers.', 'newFolderButton');

		this.addToggleSetting(navigationGroup, 'Hide "Sort order" button', 'Hide "Sort order" button in navigation headers.', 'sortOrderButton');

		this.addToggleSetting(navigationGroup, 'Hide "Auto-reveal" button', 'Hide "Auto-reveal" button in navigation headers.', 'autoRevealButton');

		this.addToggleSetting(navigationGroup, 'Hide "Collapse all" button', 'Hide "Collapse all" button in navigation headers.', 'collapseAllButton');

		this.addToggleSetting(navigationGroup, 'Hide "Reading mode" button', 'Hide "Reading mode" button in view headers.', 'readingModeButton');

		this.addToggleSetting(navigationGroup, 'Hide "Search settings" button', 'Hide "Search settings" button in search pane.', 'searchSettingsButton');

		// ========================================
		// Vault profile area
		// ========================================
		const vaultProfileGroup = createSettingsGroup(containerEl, 'Vault profile area');

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
		if (!this.plugin.settings.helpButtonReplacement) {
			this.plugin.settings.helpButtonReplacement = {
				enabled: false,
				commandId: '',
				iconId: 'wrench',
			};
		}

		vaultProfileGroup.addSetting((setting) =>
			setting
				.setName('Replace help button with custom action')
				.setDesc('Replace the help button with a custom icon and command. This will hide the original help button and show your custom button instead.')
				.addToggle((toggle) =>
					toggle.setValue(this.plugin.settings.helpButtonReplacement.enabled).onChange((value) => {
						if (!this.plugin.settings.helpButtonReplacement) {
							this.plugin.settings.helpButtonReplacement = {
								enabled: true,
								commandId: '',
								iconId: 'wrench',
							};
						}
						this.plugin.settings.helpButtonReplacement.enabled = value;
						void (async () => {
							await this.plugin.saveSettings();
						})();
						this.plugin.refresh();
						
						// Save scroll position before re-rendering
						const scrollContainer = containerEl.closest('.vertical-tab-content') || containerEl.closest('.settings-content') || containerEl.parentElement;
						const scrollTop = scrollContainer?.scrollTop || 0;
						
						this.display(); // Re-render to show/hide options
						
						// Restore scroll position after a brief delay to allow rendering
						requestAnimationFrame(() => {
							if (scrollContainer) {
								scrollContainer.scrollTop = scrollTop;
							}
						});
					})
				)
		);

		// Show command and icon pickers only if replacement is enabled
		if (this.plugin.settings.helpButtonReplacement?.enabled) {
			// Use the exact same approach as CommandPickerModal - just look up by ID
			const getCommandName = (commandId: string): string => {
				if (!commandId) return 'Select command...';
				
				try {
					const commandRegistry = (this.app as { commands?: { listCommands?: () => Array<{ id: string; name: string }> } }).commands;
					if (commandRegistry && typeof commandRegistry.listCommands === 'function') {
						const commands = commandRegistry.listCommands();
						// Find command by ID - try multiple formats
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
				} catch (e) {
					console.warn('[UI Tweaker] Error getting command name:', e);
				}
				return 'Select command...';
			};

			const commandName = getCommandName(this.plugin.settings.helpButtonReplacement.commandId);
			vaultProfileGroup.addSetting((setting) =>
				setting
					.setName('Command')
					.setDesc('Select the command to execute when the button is clicked')
					.addButton((button) =>
						button.setButtonText(commandName || 'Select command...').onClick(() => {
							const modal = new CommandPickerModal(this.app, (commandId) => {
								if (!this.plugin.settings.helpButtonReplacement) {
									this.plugin.settings.helpButtonReplacement = {
										enabled: true,
										commandId: '',
										iconId: 'wrench',
									};
								}
								this.plugin.settings.helpButtonReplacement.commandId = commandId;
								void (async () => {
									await this.plugin.saveSettings();
								})();
								this.plugin.refresh();
								
								// Save scroll position before re-rendering
								const scrollContainer = containerEl.closest('.vertical-tab-content') || containerEl.closest('.settings-content') || containerEl.parentElement;
								const scrollTop = scrollContainer?.scrollTop || 0;
								
								this.display(); // Re-render to show updated command name
								
								// Restore scroll position after a brief delay to allow rendering
								requestAnimationFrame(() => {
									if (scrollContainer) {
										scrollContainer.scrollTop = scrollTop;
									}
								});
							});
							modal.open();
						})
					)
			);

			const getIconName = (iconId: string): string => {
				if (!iconId) return '';
				return iconId
					.replace(/^lucide-/, '')
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
			};

			const iconName = getIconName(this.plugin.settings.helpButtonReplacement.iconId);
			vaultProfileGroup.addSetting((setting) =>
				setting
					.setName('Icon')
					.setDesc('Select the icon to display on the button')
					.addButton((button) =>
						button.setButtonText(iconName || 'Select icon...').onClick(() => {
							const modal = new IconPickerModal(this.app, (iconId) => {
								if (!this.plugin.settings.helpButtonReplacement) {
									this.plugin.settings.helpButtonReplacement = {
										enabled: true,
										commandId: 'open-settings',
										iconId: 'wrench',
									};
								}
								this.plugin.settings.helpButtonReplacement.iconId = iconId;
								void (async () => {
									await this.plugin.saveSettings();
								})();
								this.plugin.refresh();
								
								// Save scroll position before re-rendering
								const scrollContainer = containerEl.closest('.vertical-tab-content') || containerEl.closest('.settings-content') || containerEl.parentElement;
								const scrollTop = scrollContainer?.scrollTop || 0;
								
								this.display(); // Re-render to show updated icon name
								
								// Restore scroll position after a brief delay to allow rendering
								requestAnimationFrame(() => {
									if (scrollContainer) {
										scrollContainer.scrollTop = scrollTop;
									}
								});
							});
							modal.open();
						})
					)
			);
		}

		this.addVisibilitySetting(
			vaultProfileGroup,
			'Settings button',
			'Hide settings button until hover. Elegantly reveals on hover.',
			'settingsButton'
		);

		vaultProfileGroup.addSetting((setting) =>
			setting
				.setName('Vault switcher background transparency')
				.setDesc('Adjust the transparency of the vault switcher background when hidden. Range: 0 (fully transparent) to 1 (fully opaque).')
				.addSlider((slider) =>
					slider
						.setLimits(0, 1, 0.01)
						.setValue(this.plugin.settings.vaultSwitcherBackgroundTransparency)
						.setDynamicTooltip()
						.onChange((value) => {
							this.plugin.settings.vaultSwitcherBackgroundTransparency = value;
							void (async () => {
								await this.plugin.saveSettings();
							})();
							this.plugin.refresh();
						})
				)
		);

		// ========================================
		// Tab icons
		// ========================================
		const tabIconsGroup = createSettingsGroup(containerEl, 'Tab icons');

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
		const statusUIGroup = createSettingsGroup(containerEl, 'Status & UI elements');

		this.addToggleSetting(statusUIGroup, 'Hide status bar', 'Hides word count, character count and backlink count.', 'statusBar');

		this.addToggleSetting(statusUIGroup, 'Hide scroll bars', 'Hides all scroll bars.', 'scrollBars');

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
		const searchGroup = createSettingsGroup(containerEl, 'Search');

		this.addToggleSetting(searchGroup, 'Hide search suggestions', 'Hides suggestions in search pane.', 'searchSuggestions');

		this.addToggleSetting(searchGroup, 'Hide count of search term matches', 'Hides the number of matches within each search result.', 'searchTermCounts');

		// ========================================
		// Properties
		// ========================================
		const propertiesGroup = createSettingsGroup(containerEl, 'Properties');

		this.addToggleSetting(propertiesGroup, 'Hide properties in Reading view', 'Hides the properties section in Reading view.', 'propertiesInReadingView');

		this.addToggleSetting(propertiesGroup, 'Hide properties heading', 'Hide "Properties" heading above properties.', 'propertiesInHeading');

		this.addToggleSetting(propertiesGroup, 'Hide "Add property" button', 'Hide "Add property" button below properties.', 'addPropertyButton');

		// ========================================
		// Mobile
		// ========================================
		const mobileGroup = createSettingsGroup(containerEl, 'Mobile');

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
		if (!this.plugin.settings.syncButtonReplacement) {
			this.plugin.settings.syncButtonReplacement = {
				enabled: false,
				commandId: 'open-settings',
				iconId: 'wrench',
			};
		}

		mobileGroup.addSetting((setting) =>
			setting
				.setName('Replace sync button with custom action')
				.setDesc('Replace the sync button in the mobile sidebar with a custom icon and command. This will hide the original sync button and show your custom button instead.')
				.addToggle((toggle) =>
					toggle.setValue(this.plugin.settings.syncButtonReplacement.enabled).onChange((value) => {
						if (!this.plugin.settings.syncButtonReplacement) {
							this.plugin.settings.syncButtonReplacement = {
								enabled: true,
								commandId: '',
								iconId: 'wrench',
							};
						}
						this.plugin.settings.syncButtonReplacement.enabled = value;
						void (async () => {
							await this.plugin.saveSettings();
						})();
						this.plugin.refresh();
						
						// Save scroll position before re-rendering
						const scrollContainer = containerEl.closest('.vertical-tab-content') || containerEl.closest('.settings-content') || containerEl.parentElement;
						const scrollTop = scrollContainer?.scrollTop || 0;
						
						this.display(); // Re-render to show/hide options
						
						// Restore scroll position after a brief delay to allow rendering
						requestAnimationFrame(() => {
							if (scrollContainer) {
								scrollContainer.scrollTop = scrollTop;
							}
						});
					})
				)
		);

		// Show command and icon pickers only if replacement is enabled
		if (this.plugin.settings.syncButtonReplacement?.enabled) {
			// Use the exact same approach as CommandPickerModal - just look up by ID
			const getCommandName = (commandId: string): string => {
				if (!commandId) return 'Select command...';
				
				try {
					const commandRegistry = (this.app as { commands?: { listCommands?: () => Array<{ id: string; name: string }> } }).commands;
					if (commandRegistry && typeof commandRegistry.listCommands === 'function') {
						const commands = commandRegistry.listCommands();
						// Find command by ID - try multiple formats
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
				} catch (e) {
					console.warn('[UI Tweaker] Error getting command name:', e);
				}
				return 'Select command...';
			};

			const commandName = getCommandName(this.plugin.settings.syncButtonReplacement.commandId);
			mobileGroup.addSetting((setting) =>
				setting
					.setName('Command')
					.setDesc('Select the command to execute when the button is clicked')
					.addButton((button) =>
						button.setButtonText(commandName || 'Select command...').onClick(() => {
							const modal = new CommandPickerModal(this.app, (commandId) => {
								if (!this.plugin.settings.syncButtonReplacement) {
									this.plugin.settings.syncButtonReplacement = {
										enabled: true,
										commandId: '',
										iconId: 'wrench',
									};
								}
								this.plugin.settings.syncButtonReplacement.commandId = commandId;
								void (async () => {
									await this.plugin.saveSettings();
								})();
								this.plugin.refresh();
								
								// Save scroll position before re-rendering
								const scrollContainer = containerEl.closest('.vertical-tab-content') || containerEl.closest('.settings-content') || containerEl.parentElement;
								const scrollTop = scrollContainer?.scrollTop || 0;
								
								this.display(); // Re-render to show updated command name
								
								// Restore scroll position after a brief delay to allow rendering
								requestAnimationFrame(() => {
									if (scrollContainer) {
										scrollContainer.scrollTop = scrollTop;
									}
								});
							});
							modal.open();
						})
					)
			);

			const getIconName = (iconId: string): string => {
				if (!iconId) return '';
				return iconId
					.replace(/^lucide-/, '')
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
			};

			const iconName = getIconName(this.plugin.settings.syncButtonReplacement.iconId);
			mobileGroup.addSetting((setting) =>
				setting
					.setName('Icon')
					.setDesc('Select the icon to display on the button')
					.addButton((button) =>
						button.setButtonText(iconName || 'Select icon...').onClick(() => {
							const modal = new IconPickerModal(this.app, (iconId) => {
								if (!this.plugin.settings.syncButtonReplacement) {
									this.plugin.settings.syncButtonReplacement = {
										enabled: true,
										commandId: 'open-settings',
										iconId: 'wrench',
									};
								}
								this.plugin.settings.syncButtonReplacement.iconId = iconId;
								void (async () => {
									await this.plugin.saveSettings();
								})();
								this.plugin.refresh();
								
								// Save scroll position before re-rendering
								const scrollContainer = containerEl.closest('.vertical-tab-content') || containerEl.closest('.settings-content') || containerEl.parentElement;
								const scrollTop = scrollContainer?.scrollTop || 0;
								
								this.display(); // Re-render to show updated icon name
								
								// Restore scroll position after a brief delay to allow rendering
								requestAnimationFrame(() => {
									if (scrollContainer) {
										scrollContainer.scrollTop = scrollTop;
									}
								});
							});
							modal.open();
						})
					)
			);
		}

		// ========================================
		// Mobile navigation menu
		// ========================================
		const mobileNavGroup = createSettingsGroup(containerEl, 'Mobile navigation menu');

		this.addPositionSetting(mobileNavGroup, '"Navigate back" button position', 'Select the position for the "Navigate back" button (default 1).', 'navigateButtonPosition');

		this.addPositionSetting(mobileNavGroup, '"Navigate forward" button position', 'Select the position for the "Navigate forward" button (default 2).', 'navigationButtonPosition');

		this.addPositionSetting(mobileNavGroup, '"Quick switcher" button position', 'Select the position for the "Quick switcher" button (default 3).', 'quickSwitcherPosition');

		this.addPositionSetting(mobileNavGroup, '"New tab" button position', 'Select the position for the "New tab" button (default 4).', 'newTabPosition');

		this.addPositionSetting(mobileNavGroup, '"Open tabs" button position', 'Select the position for the "Open tabs" button (default 5).', 'openTabsPosition');

		this.addPositionSetting(mobileNavGroup, '"Ribbon menu" button position', 'Select the position for the "Ribbon menu" button (default 6).', 'ribbonMenuPosition');
	}

	private addVisibilitySetting(group: SettingsContainer, name: string, desc: string, key: keyof UISettings) {
		group.addSetting((setting) =>
			setting
				.setName(name)
				.setDesc(desc)
				.addDropdown((dropdown) => {
					const currentValue = this.plugin.settings[key];
					const stringValue = typeof currentValue === 'string' ? currentValue : 'show';
					dropdown
						.addOption('show', 'Show')
						.addOption('hide', 'Hide')
						.addOption('reveal', 'Reveal')
						.setValue(stringValue)
						.onChange((value) => {
							(this.plugin.settings[key] as UIVisibilityState) = value as UIVisibilityState;
							void (async () => {
								await this.plugin.saveSettings();
							})();
							this.plugin.refresh();
						});
				})
		);
	}

	private addToggleSetting(group: SettingsContainer, name: string, desc: string, key: keyof UISettings) {
		group.addSetting((setting) =>
			setting
				.setName(name)
				.setDesc(desc)
				.addToggle((toggle) =>
				toggle.setValue(Boolean(this.plugin.settings[key])).onChange((value) => {
					(this.plugin.settings[key] as boolean) = value;
					void (async () => {
						await this.plugin.saveSettings();
					})();
					this.plugin.refresh();
				})
				)
		);
	}

	private addPositionSetting(group: SettingsContainer, name: string, desc: string, key: keyof UISettings) {
		group.addSetting((setting) =>
			setting
				.setName(name)
				.setDesc(desc)
				.addDropdown((dropdown) => {
					for (let i = 1; i <= 6; i++) {
						dropdown.addOption(String(i), String(i));
					}
					const currentValue = this.plugin.settings[key];
					const stringValue = typeof currentValue === 'string' ? currentValue : '1';
					dropdown.setValue(stringValue).onChange((value) => {
						(this.plugin.settings[key] as string) = value;
						void (async () => {
							await this.plugin.saveSettings();
						})();
						this.plugin.refresh();
					});
				})
		);
	}
}
