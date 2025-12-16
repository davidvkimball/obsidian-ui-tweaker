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
	registerToggleCommand(plugin, 'toggle-title-bar', 'Toggle title bar', async () => {
		settings.titleBar = toggleVisibilityState(settings.titleBar);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-file-explorer-nav-header', 'Toggle file explorer navigation header', async () => {
		settings.fileExplorerNavHeader = toggleVisibilityState(settings.fileExplorerNavHeader);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-other-nav-headers', 'Toggle other navigation headers', async () => {
		settings.otherNavHeaders = toggleVisibilityState(settings.otherNavHeaders);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-left-tab-headers', 'Toggle left tab headers', async () => {
		settings.leftTabHeaders = toggleVisibilityState(settings.leftTabHeaders);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-right-tab-headers', 'Toggle right tab headers', async () => {
		settings.rightTabHeaders = toggleVisibilityState(settings.rightTabHeaders);
		await saveSettings();
		refresh();
	});

	// Note: Ribbon toggle excluded - uses base Obsidian command

	registerToggleCommand(plugin, 'toggle-vault-switcher', 'Toggle vault switcher', async () => {
		settings.vaultSwitcher = toggleVisibilityState(settings.vaultSwitcher);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-help-button', 'Toggle help button', async () => {
		settings.helpButton = toggleVisibilityState(settings.helpButton);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-settings-button', 'Toggle settings button', async () => {
		settings.settingsButton = toggleVisibilityState(settings.settingsButton);
		await saveSettings();
		refresh();
	});

	// Open settings command
	plugin.addCommand({
		id: 'open-settings',
		name: 'Open settings',
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


	registerToggleCommand(plugin, 'toggle-tab-bar', 'Toggle tab bar', async () => {
		settings.tabBar = !settings.tabBar;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-new-note-button', 'Toggle new note button', async () => {
		settings.newNoteButton = !settings.newNoteButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-new-folder-button', 'Toggle new folder button', async () => {
		settings.newFolderButton = !settings.newFolderButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-sort-order-button', 'Toggle sort order button', async () => {
		settings.sortOrderButton = !settings.sortOrderButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-auto-reveal-button', 'Toggle auto reveal button', async () => {
		settings.autoRevealButton = !settings.autoRevealButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-collapse-all-button', 'Toggle collapse all button', async () => {
		settings.collapseAllButton = !settings.collapseAllButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-reading-mode-button', 'Toggle reading mode button', async () => {
		settings.readingModeButton = !settings.readingModeButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-search-settings-button', 'Toggle search settings button', async () => {
		settings.searchSettingsButton = !settings.searchSettingsButton;
		await saveSettings();
		refresh();
	});

	// Tab icons - now support Show/Hide/Reveal
	registerToggleCommand(plugin, 'toggle-tab-list-icon', 'Toggle tab list icon', async () => {
		settings.tabListIcon = toggleVisibilityState(settings.tabListIcon);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-new-tab-icon', 'Toggle new tab icon', async () => {
		settings.newTabIcon = toggleVisibilityState(settings.newTabIcon);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-tab-close-button', 'Toggle tab close button', async () => {
		settings.tabCloseButton = toggleVisibilityState(settings.tabCloseButton);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-status-bar', 'Toggle status bar', async () => {
		settings.statusBar = !settings.statusBar;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-scroll-bars', 'Toggle scroll bars', async () => {
		settings.scrollBars = !settings.scrollBars;
		await saveSettings();
		refresh();
	});

	// Sidebar toggle buttons - now support Show/Hide/Reveal
	registerToggleCommand(plugin, 'toggle-left-sidebar-toggle-button', 'Toggle left sidebar toggle button', async () => {
		settings.leftSidebarToggleButton = toggleVisibilityState(settings.leftSidebarToggleButton);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-right-sidebar-toggle-button', 'Toggle right sidebar toggle button', async () => {
		settings.rightSidebarToggleButton = toggleVisibilityState(settings.rightSidebarToggleButton);
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-tooltips', 'Toggle tooltips', async () => {
		settings.tooltips = !settings.tooltips;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-search-suggestions', 'Toggle search suggestions', async () => {
		settings.searchSuggestions = !settings.searchSuggestions;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-search-term-counts', 'Toggle search term counts', async () => {
		settings.searchTermCounts = !settings.searchTermCounts;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-properties-reading-view', 'Toggle properties in Reading view', async () => {
		settings.propertiesInReadingView = !settings.propertiesInReadingView;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-properties-heading', 'Toggle properties heading', async () => {
		settings.propertiesInHeading = !settings.propertiesInHeading;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-add-property-button', 'Toggle add property button', async () => {
		settings.addPropertyButton = !settings.addPropertyButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-instructions', 'Toggle instructions', async () => {
		settings.instructions = !settings.instructions;
		await saveSettings();
		refresh();
	});

	// Mobile toggle commands
	registerToggleCommand(plugin, 'toggle-mobile-chevrons-icon', 'Toggle mobile chevrons icon', async () => {
		settings.mobileChevronsIcon = !settings.mobileChevronsIcon;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-navigate-back-button', 'Toggle navigate back button', async () => {
		settings.navigateBackButton = !settings.navigateBackButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-navigate-forward-button', 'Toggle navigate forward button', async () => {
		settings.navigateForwardButton = !settings.navigateForwardButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-quick-switcher-button', 'Toggle quick switcher button', async () => {
		settings.quickSwitcherButton = !settings.quickSwitcherButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-mobile-new-tab-button', 'Toggle mobile new tab button', async () => {
		settings.mobileNewTabButton = !settings.mobileNewTabButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-open-tab-button', 'Toggle open tab button', async () => {
		settings.openTabButton = !settings.openTabButton;
		await saveSettings();
		refresh();
	});

	registerToggleCommand(plugin, 'toggle-ribbon-menu-button', 'Toggle ribbon menu button', async () => {
		settings.ribbonMenuButton = !settings.ribbonMenuButton;
		await saveSettings();
		refresh();
	});
}

function registerToggleCommand(plugin: Plugin, id: string, name: string, callback: () => void | Promise<void>) {
	plugin.addCommand({
		id: id,
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
