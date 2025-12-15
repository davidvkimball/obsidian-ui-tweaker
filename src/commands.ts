/**
 * Command registration
 */

import { Plugin } from 'obsidian';
import { UISettings } from './settings';
import { UIVisibilityState } from './types';

interface CommandContext {
	plugin: Plugin;
	settings: UISettings;
	saveSettings: () => Promise<void>;
	refresh: () => void;
}

export function registerCommands(context: CommandContext) {
	const { plugin, settings, saveSettings, refresh } = context;

	// Toggle commands for auto-hide elements (Show/Hide/Reveal)
	registerToggleCommand(plugin, 'toggle-title-bar', 'Toggle title bar', () => {
		settings.titleBar = toggleVisibilityState(settings.titleBar);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-file-explorer-nav-header', 'Toggle file explorer navigation header', () => {
		settings.fileExplorerNavHeader = toggleVisibilityState(settings.fileExplorerNavHeader);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-other-nav-headers', 'Toggle other navigation headers', () => {
		settings.otherNavHeaders = toggleVisibilityState(settings.otherNavHeaders);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-left-tab-headers', 'Toggle left tab headers', () => {
		settings.leftTabHeaders = toggleVisibilityState(settings.leftTabHeaders);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-right-tab-headers', 'Toggle right tab headers', () => {
		settings.rightTabHeaders = toggleVisibilityState(settings.rightTabHeaders);
		saveSettings();
		refresh();
	});

	// Note: Ribbon toggle excluded - uses base Obsidian command

	registerToggleCommand(plugin, 'toggle-vault-switcher', 'Toggle vault switcher', () => {
		settings.vaultSwitcher = toggleVisibilityState(settings.vaultSwitcher);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-help-button', 'Toggle help button', () => {
		settings.helpButton = toggleVisibilityState(settings.helpButton);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-settings-button', 'Toggle settings button', () => {
		settings.settingsButton = toggleVisibilityState(settings.settingsButton);
		saveSettings();
		refresh();
	});

	// Open UI Tweaker settings command
	plugin.addCommand({
		id: 'ui-tweaker:open-settings',
		name: 'Open UI Tweaker',
		callback: () => {
			// Access app through plugin instance (Plugin class has app property)
			const app = plugin.app;
			// Use type assertion for setting API as it's not in the public type definitions
			// but is available in the runtime API
			const settingApi = (app as { setting?: { open?: () => void; openTabById?: (id: string) => void } }).setting;
			if (settingApi) {
				settingApi.open?.();
				// Open the plugin's settings tab
				// Use type assertion for settingTab as it's a private property
				const pluginInstance = plugin as { settingTab?: { id?: string } };
				if (pluginInstance.settingTab?.id && settingApi.openTabById) {
					settingApi.openTabById(pluginInstance.settingTab.id);
				}
			}
		},
	});

	// Toggle commands for simple toggles


	registerToggleCommand(plugin, 'toggle-tab-bar', 'Toggle tab bar', () => {
		settings.tabBar = !settings.tabBar;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-new-note-button', 'Toggle new note button', () => {
		settings.newNoteButton = !settings.newNoteButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-new-folder-button', 'Toggle new folder button', () => {
		settings.newFolderButton = !settings.newFolderButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-sort-order-button', 'Toggle sort order button', () => {
		settings.sortOrderButton = !settings.sortOrderButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-auto-reveal-button', 'Toggle auto reveal button', () => {
		settings.autoRevealButton = !settings.autoRevealButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-collapse-all-button', 'Toggle collapse all button', () => {
		settings.collapseAllButton = !settings.collapseAllButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-reading-mode-button', 'Toggle reading mode button', () => {
		settings.readingModeButton = !settings.readingModeButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-search-settings-button', 'Toggle search settings button', () => {
		settings.searchSettingsButton = !settings.searchSettingsButton;
		saveSettings();
		refresh();
	});

	// Tab icons - now support Show/Hide/Reveal
	registerToggleCommand(plugin, 'toggle-tab-list-icon', 'Toggle tab list icon', () => {
		settings.tabListIcon = toggleVisibilityState(settings.tabListIcon);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-new-tab-icon', 'Toggle new tab icon', () => {
		settings.newTabIcon = toggleVisibilityState(settings.newTabIcon);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-tab-close-button', 'Toggle tab close button', () => {
		settings.tabCloseButton = toggleVisibilityState(settings.tabCloseButton);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-status-bar', 'Toggle status bar', () => {
		settings.statusBar = !settings.statusBar;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-scroll-bars', 'Toggle scroll bars', () => {
		settings.scrollBars = !settings.scrollBars;
		saveSettings();
		refresh();
	});

	// Sidebar toggle buttons - now support Show/Hide/Reveal
	registerToggleCommand(plugin, 'toggle-left-sidebar-toggle-button', 'Toggle left sidebar toggle button', () => {
		settings.leftSidebarToggleButton = toggleVisibilityState(settings.leftSidebarToggleButton);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-right-sidebar-toggle-button', 'Toggle right sidebar toggle button', () => {
		settings.rightSidebarToggleButton = toggleVisibilityState(settings.rightSidebarToggleButton);
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-tooltips', 'Toggle tooltips', () => {
		settings.tooltips = !settings.tooltips;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-search-suggestions', 'Toggle search suggestions', () => {
		settings.searchSuggestions = !settings.searchSuggestions;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-search-term-counts', 'Toggle search term counts', () => {
		settings.searchTermCounts = !settings.searchTermCounts;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-properties-reading-view', 'Toggle properties in Reading view', () => {
		settings.propertiesInReadingView = !settings.propertiesInReadingView;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-properties-heading', 'Toggle properties heading', () => {
		settings.propertiesInHeading = !settings.propertiesInHeading;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-add-property-button', 'Toggle add property button', () => {
		settings.addPropertyButton = !settings.addPropertyButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-instructions', 'Toggle instructions', () => {
		settings.instructions = !settings.instructions;
		saveSettings();
		refresh();
	});

	// Mobile toggle commands
	registerToggleCommand(plugin, 'toggle-mobile-chevrons-icon', 'Toggle mobile chevrons icon', () => {
		settings.mobileChevronsIcon = !settings.mobileChevronsIcon;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-navigate-back-button', 'Toggle navigate back button', () => {
		settings.navigateBackButton = !settings.navigateBackButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-navigate-forward-button', 'Toggle navigate forward button', () => {
		settings.navigateForwardButton = !settings.navigateForwardButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-quick-switcher-button', 'Toggle quick switcher button', () => {
		settings.quickSwitcherButton = !settings.quickSwitcherButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-mobile-new-tab-button', 'Toggle mobile new tab button', () => {
		settings.mobileNewTabButton = !settings.mobileNewTabButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-open-tab-button', 'Toggle open tab button', () => {
		settings.openTabButton = !settings.openTabButton;
		saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-ribbon-menu-button', 'Toggle ribbon menu button', () => {
		settings.ribbonMenuButton = !settings.ribbonMenuButton;
		saveSettings();
		refresh();
	});
}

function registerToggleCommand(plugin: Plugin, id: string, name: string, callback: () => void) {
	plugin.addCommand({
		id: `ui-tweaker:${id}`,
		name: name,
		callback: callback,
	});
}

function toggleVisibilityState(currentState: UIVisibilityState): UIVisibilityState {
	// If current state is "reveal", reset to "show" first
	if (currentState === 'reveal') {
		return 'hide';
	}
	// Toggle between "show" and "hide"
	return currentState === 'show' ? 'hide' : 'show';
}
