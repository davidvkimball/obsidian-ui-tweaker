import { App, PluginSettingTab, ButtonComponent, Setting } from 'obsidian';
import UITweakerPlugin from '../main';
import { setCssProps } from '../utils/cssUtils';
import { DEFAULT_SETTINGS } from '../settings';
import { CommandPickerModal } from '../modals/CommandPickerModal';
import { IconPickerModal } from '../modals/IconPickerModal';
import { TabRenderer } from './common/TabRenderer';
import { HiderTab } from './tabs/HiderTab';
import { TabBarTab } from './tabs/TabBarTab';
import { StatusBarTab } from './tabs/StatusBarTab';
import { ExplorerTab } from './tabs/ExplorerTab';
import { MobileTab } from './tabs/MobileTab';
import { PropertiesTab } from './tabs/PropertiesTab';

type TabId = 'hider' | 'status-bar' | 'tab-bar' | 'explorer' | 'properties' | 'mobile';

interface TabDefinition {
	id: TabId;
	name: string;
	renderer: TabRenderer;
}

export class UITweakerSettingTab extends PluginSettingTab {
	plugin: UITweakerPlugin;
	public icon = 'lucide-wrench';
	public id = 'ui-tweaker';

	private tabContentMap: Map<TabId, HTMLElement> = new Map();
	private tabButtons: Map<TabId, ButtonComponent> = new Map();
	private activeTabId: TabId | null = null;

	// Shared state for the declarative "Properties" page: one PropertiesTab
	// instance backs both the reset button and the dynamic icons section, and
	// the section host is retained so a reset can re-render the list in place.
	private propertiesTabInstance: PropertiesTab | null = null;
	private propertiesIconsSectionHost: HTMLElement | null = null;

	// Shared StatusBarTab instance backing the declarative "Status bar" page's
	// managed item list, mirroring the propertiesTabInstance precedent.
	private statusBarTabInstance: StatusBarTab | null = null;

	// Shared TabBarTab instance backing the declarative "Tab bar" page's managed
	// command list, mirroring the statusBarTabInstance precedent.
	private tabBarTabInstance: TabBarTab | null = null;

	// Shared ExplorerTab instance backing the declarative "Explorer" page's
	// managed button list, mirroring the tabBarTabInstance precedent.
	private explorerTabInstance: ExplorerTab | null = null;

	constructor(app: App, plugin: UITweakerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// 1.13.0+: framework calls this and renders each tab as a navigable
	// sub-page, surfacing the settings in the built-in search. Pre-1.13.0: this
	// is ignored and display() runs the tabbed UI.
	getSettingDefinitions() {
		return [
			{
				type: 'page' as const,
				name: 'Hider',
				items: [
					{
						// "Reset to default" affordance reproduced from the imperative
						// HiderTab: restores every Hider key to its default, persists,
						// then re-applies the UI tweaks. Custom DOM (named render), so it
						// is not surfaced in search. The framework owns re-rendering the
						// control rows, matching the Properties/Mobile page precedent.
						name: 'Reset to default',
						render: (setting: Setting) => {
							this.hidePropertiesSettingChrome(setting);
							const host = setting.settingEl.createDiv();
							this.renderHiderResetButton(host);
						},
					},
					{
						type: 'group' as const,
						heading: 'Auto-hide elements',
						items: [
							{
								name: 'Title bar',
								desc: 'Hide title bar until hover. Turn off to always show.',
								control: { type: 'dropdown' as const, key: 'titleBar', options: this.visibilityOptions() },
							},
							{
								name: 'File explorer nav header',
								desc: 'Hide file explorer navigation header until hover. Elegantly reveals on hover.',
								control: { type: 'dropdown' as const, key: 'fileExplorerNavHeader', options: this.visibilityOptions() },
							},
							{
								name: 'Other nav headers',
								desc: 'Hide navigation headers for tag, backlinks, outgoing links, outline, and bookmarks panes until hover.',
								control: { type: 'dropdown' as const, key: 'otherNavHeaders', options: this.visibilityOptions() },
							},
							{
								name: 'Left tab headers',
								desc: 'Hide left panel tab headers until hover. Elegantly reveals on hover.',
								control: { type: 'dropdown' as const, key: 'leftTabHeaders', options: this.visibilityOptions() },
							},
							{
								name: 'Right tab headers',
								desc: 'Hide right panel tab headers until hover. Elegantly reveals on hover.',
								control: { type: 'dropdown' as const, key: 'rightTabHeaders', options: this.visibilityOptions() },
							},
							{
								name: 'Collapse ribbon',
								desc: 'Collapse the left ribbon to a thin strip until hover. Elegantly expands on hover.',
								control: { type: 'toggle' as const, key: 'ribbonRevealOnHover' },
							},
						],
					},
					{
						type: 'group' as const,
						heading: 'Navigation',
						items: [
							{
								name: 'Hide tab bar',
								desc: 'Hides the tab container at the top of the window.',
								control: { type: 'toggle' as const, key: 'tabBar' },
							},
							{
								name: 'Make top of window draggable without tab bar',
								desc: 'Enables window dragging from the top of the window when the tab bar is hidden. Only works when "Hide tab bar" is enabled.',
								control: { type: 'toggle' as const, key: 'enableWindowDragging' },
							},
							{
								name: 'Hide tab header when only one tab',
								desc: 'Hide the tab bar automatically when only 1 tab is open.',
								control: { type: 'toggle' as const, key: 'tabBarHideWhenSingle' },
							},
							{
								name: 'Hide "Reading mode" button',
								desc: 'Hide "Reading mode" button in view headers.',
								control: { type: 'toggle' as const, key: 'readingModeButton' },
							},
							{
								name: 'Hide "Bookmarked" button',
								desc: 'Hide "Bookmarked" button in view headers.',
								control: { type: 'toggle' as const, key: 'bookmarkedButton' },
							},
							{
								name: 'Hide "Search settings" button',
								desc: 'Hide "Search settings" button in search pane.',
								control: { type: 'toggle' as const, key: 'searchSettingsButton' },
							},
						],
					},
					{
						type: 'group' as const,
						heading: 'Vault profile area',
						items: [
							{
								name: 'Vault switcher',
								desc: 'Hide vault switcher until hover. Does not work when vault name is hidden.',
								control: { type: 'dropdown' as const, key: 'vaultSwitcher', options: this.visibilityOptions() },
							},
							{
								name: 'Help button',
								desc: 'Hide help button until hover. Elegantly reveals on hover.',
								control: { type: 'dropdown' as const, key: 'helpButton', options: this.visibilityOptions() },
							},
							{
								name: 'Replace help button with custom action',
								desc: 'Replace the help button with a custom icon and command. This will hide the original help button and show your custom button instead.',
								control: { type: 'toggle' as const, key: 'helpButtonReplacement.enabled' },
							},
							{
								// Command picker (modal) shown only while the replacement
								// is enabled. Custom UI (named render); not searchable. The
								// visible predicate replaces the imperative tab's instant
								// show/hide of this dependent row.
								name: 'Command',
								desc: 'Select the command to execute when the button is clicked',
								visible: () => Boolean(this.plugin.settings.helpButtonReplacement?.enabled),
								render: (setting: Setting) => {
									this.renderHelpButtonCommandControl(setting);
								},
							},
							{
								// Icon picker (modal) shown only while the replacement is
								// enabled. Custom UI (named render); not searchable.
								name: 'Icon',
								desc: 'Select the icon to display on the button',
								visible: () => Boolean(this.plugin.settings.helpButtonReplacement?.enabled),
								render: (setting: Setting) => {
									this.renderHelpButtonIconControl(setting);
								},
							},
							{
								name: 'Settings button',
								desc: 'Hide settings button until hover. Elegantly reveals on hover.',
								control: { type: 'dropdown' as const, key: 'settingsButton', options: this.visibilityOptions() },
							},
							{
								name: 'Vault switcher background transparency',
								desc: 'Adjust the transparency of the vault switcher background when hidden. Range: 0 (fully transparent) to 1 (fully opaque).',
								control: { type: 'slider' as const, key: 'vaultSwitcherBackgroundTransparency', min: 0, max: 1, step: 0.01 },
							},
						],
					},
					{
						type: 'group' as const,
						heading: 'Tab icons',
						items: [
							{
								name: 'Hide tab list icon',
								desc: 'Hides the tab list icon. You can still access tabs via other methods.',
								control: { type: 'dropdown' as const, key: 'tabListIcon', options: this.visibilityOptions() },
							},
							{
								name: 'Hide new tab icon',
								desc: 'Hides the new tab icon. You can still create new tabs with Ctrl+T (Cmd+T on Mac).',
								control: { type: 'dropdown' as const, key: 'newTabIcon', options: this.visibilityOptions() },
							},
							{
								name: 'Hide tab close button',
								desc: 'Hides the close button on tabs. You can still close tabs with middle click or other methods.',
								control: { type: 'dropdown' as const, key: 'tabCloseButton', options: this.visibilityOptions() },
							},
						],
					},
					{
						type: 'group' as const,
						heading: 'Status & UI elements',
						items: [
							{
								name: 'Hide status bar',
								desc: 'Hides word count, character count and backlink count.',
								control: { type: 'toggle' as const, key: 'statusBar' },
							},
							{
								name: 'Scroll bars',
								desc: 'Control scrollbar visibility. Reveal option hides scrollbars until hover.',
								control: { type: 'dropdown' as const, key: 'scrollBars', options: this.visibilityOptions() },
							},
							{
								name: 'Hide left sidebar toggle button',
								desc: 'Hides the left sidebar toggle button.',
								control: { type: 'dropdown' as const, key: 'leftSidebarToggleButton', options: this.visibilityOptions() },
							},
							{
								name: 'Hide right sidebar toggle button',
								desc: 'Hides the right sidebar toggle button.',
								control: { type: 'dropdown' as const, key: 'rightSidebarToggleButton', options: this.visibilityOptions() },
							},
							{
								name: 'Hide tooltips',
								desc: 'Hides all tooltips.',
								control: { type: 'toggle' as const, key: 'tooltips' },
							},
							{
								name: 'Hide instructions',
								desc: 'Hides instructional tips in modals.',
								control: { type: 'toggle' as const, key: 'instructions' },
							},
						],
					},
					{
						type: 'group' as const,
						heading: 'Search',
						items: [
							{
								name: 'Hide search suggestions',
								desc: 'Hides suggestions in search pane.',
								control: { type: 'toggle' as const, key: 'searchSuggestions' },
							},
							{
								name: 'Hide count of search term matches',
								desc: 'Hides the number of matches within each search result.',
								control: { type: 'toggle' as const, key: 'searchTermCounts' },
							},
						],
					},
					{
						type: 'group' as const,
						heading: 'Properties',
						items: [
							{
								name: 'Hide properties in Reading view',
								desc: 'Hides the properties section in Reading view.',
								control: { type: 'toggle' as const, key: 'propertiesInReadingView' },
							},
							{
								name: 'Deemphasize properties',
								desc: 'Softens visual prominence of file properties. They become more visible on hover.',
								control: { type: 'toggle' as const, key: 'deemphasizeProperties' },
							},
							{
								name: 'Hide properties heading',
								desc: 'Hide "Properties" heading above properties.',
								control: { type: 'toggle' as const, key: 'propertiesInHeading' },
							},
							{
								name: 'Hide "Add property" button',
								desc: 'Hide "Add property" button below properties.',
								control: { type: 'toggle' as const, key: 'addPropertyButton' },
							},
						],
					},
				],
			},
			{
				type: 'page' as const,
				name: 'Status bar',
				items: [
					{
						// Reset split out as its own page item (matching the Hider page),
						// rather than embedded at the top of the list render.
						name: 'Reset to default',
						render: (setting: Setting) => {
							this.hidePropertiesSettingChrome(setting);
							const host = setting.settingEl.createDiv();
							this.statusBarPageTab().renderResetButtonSeparate(host, ['statusBarItems'], () => {
								if (this.plugin.statusBarManager) {
									this.plugin.statusBarManager.cleanup();
									this.plugin.statusBarManager.reorder();
								}
							});
						},
					},
					{
						// The entire Status bar page is a single managed, reorderable
						// list of status-bar items (existing + custom): per-row
						// show/hide, lock/pin, color picker, Markdown-only toggle,
						// inline rename, delete, drag-to-reorder, plus a top "Reset to
						// default" button and a bottom "Add command" button. None of it
						// maps to a simple settings key — every interaction mutates the
						// statusBarItems array and drives plugin.statusBarManager
						// (cleanup/reorder/addCustomCommand/removeItem/updateButtonNames),
						// which the control override does not handle. So it is reproduced
						// verbatim by delegating to the imperative StatusBarTab.render,
						// which renders the reset button, list, and add button together.
						// Genuinely custom UI (named render); not surfaced in search.
						name: 'Status bar items',
						render: (setting: Setting) => {
							this.hidePropertiesSettingChrome(setting);
							const host = setting.settingEl.createDiv('ui-tweaker-subpage-list');
							void this.statusBarPageTab().render(host, false);
						},
					},
				],
			},
			{
				type: 'page' as const,
				name: 'Tab bar',
				items: [
					{
						// Reset split out as its own page item (matching the Hider page),
						// rather than embedded at the top of the list render.
						name: 'Reset to default',
						render: (setting: Setting) => {
							this.hidePropertiesSettingChrome(setting);
							const host = setting.settingEl.createDiv();
							this.tabBarPageTab().renderResetButtonSeparate(host, ['tabBarCommands'], () => {
								if (this.plugin.tabBarManager) {
									this.plugin.tabBarManager.reorder();
								}
							});
						},
					},
					{
						// The entire Tab bar page is a single managed, reorderable list
						// of tab-bar command buttons: a top "Reset to default" button,
						// per-row inline rename, icon picker (modal), device-mode
						// dropdown, custom color picker with reset, toggle-icon picker
						// with reset, show/hide file-type text fields, move up/down,
						// delete, collapsible rows, plus a bottom "Add command" button.
						// None of it maps to a simple settings key — every interaction
						// mutates the tabBarCommands array and drives
						// plugin.tabBarManager (reorder/addCommand/removeCommand/
						// updateButtonNames), which the control override does not
						// handle. So it is reproduced verbatim by delegating to the
						// imperative TabBarTab.render, mirroring the Status bar page
						// precedent. Genuinely custom UI (named render); not surfaced
						// in search.
						name: 'Tab bar commands',
						render: (setting: Setting) => {
							this.hidePropertiesSettingChrome(setting);
							const host = setting.settingEl.createDiv('ui-tweaker-subpage-list');
							void this.tabBarPageTab().render(host, false);
						},
					},
				],
			},
			{
				type: 'page' as const,
				name: 'Explorer',
				items: [
					{
						// Reset split out as its own page item (matching the Hider page),
						// rather than embedded at the top of the list render.
						name: 'Reset to default',
						render: (setting: Setting) => {
							this.hidePropertiesSettingChrome(setting);
							const host = setting.settingEl.createDiv();
							this.explorerPageTab().renderResetButtonSeparate(host, [
								'newNoteButton', 'newFolderButton', 'sortOrderButton', 'autoRevealButton', 'collapseAllButton',
								'explorerCommands', 'explorerButtonItems', 'nativeExplorerButtonColors', 'nativeExplorerButtonIcons'
							], () => {
								if (this.plugin.explorerManager) {
									this.plugin.explorerManager.cleanup();
									const explorers = this.app.workspace.getLeavesOfType('file-explorer');
									explorers.forEach(leaf => {
										const navButtonsContainer = leaf.view?.containerEl?.querySelector('div.nav-buttons-container');
										if (navButtonsContainer) {
											const buttons = navButtonsContainer.querySelectorAll('.nav-action-button');
											buttons.forEach(btn => btn.classList.remove('ui-tweaker-explorer-button-hidden'));
										}
									});
									this.plugin.explorerManager.consolidateSettingsAndElements();
									this.plugin.explorerManager.reorder();
								}
							});
						},
					},
					{
						// The entire Explorer page is a single managed, reorderable list
						// of explorer navigation buttons (native + external + custom): a
						// top "Reset to default" button (which also cleans up, restores
						// native buttons, consolidates, and reorders via
						// plugin.explorerManager), per-row eyeball show/hide, inline
						// rename, icon picker (modal), per-row collapsible settings
						// (device-mode dropdown, custom color picker with reset, icon
						// override with reset, toggle-icon picker with reset, use-active-
						// class toggle), move up/down, delete, plus a bottom "Add command"
						// button and a usage warning callout. None of it maps to a simple
						// settings key: the show/hide state, color, icon, mode, toggle
						// icon, and active-class are all bound to elements of the
						// explorerButtonItems / explorerCommands arrays (or the
						// native*Button keys read/written only in the context of a
						// specific reorderable row), and every interaction drives
						// plugin.explorerManager (reorder/updateButtonNames/
						// applyNativeIconOverrides/consolidateSettingsAndElements/cleanup),
						// which the control override does not handle. So it is reproduced
						// verbatim by delegating to the imperative ExplorerTab.render,
						// mirroring the Status bar and Tab bar page precedents. Genuinely
						// custom UI (named render); not surfaced in search.
						name: 'Explorer buttons',
						render: (setting: Setting) => {
							this.hidePropertiesSettingChrome(setting);
							const host = setting.settingEl.createDiv('ui-tweaker-subpage-list');
							void this.explorerPageTab().render(host, false);
						},
					},
				],
			},
			{
				type: 'page' as const,
				name: 'Properties',
				items: [
					{
						// "Reset to default" affordance reproduced verbatim from the
						// imperative tab via PropertiesTab.renderPropertyResetButton,
						// which clears the three property keys, persists, refreshes the
						// properties manager, then re-renders the icons section host.
						// Custom DOM (named render), so it is not surfaced in search.
						name: 'Reset to default',
						render: (setting: Setting) => {
							this.hidePropertiesSettingChrome(setting);
							const host = setting.settingEl.createDiv();
							this.propertiesPageTab().renderPropertyResetButton(host, () => {
								this.rerenderPropertiesIconsSection();
							});
						},
					},
					{
						// These two toggles share a group so they keep their 1.13 card,
						// while the reset above sits alone in its own (stripped) card.
						type: 'group' as const,
						items: [
							{
								// NOTE: this toggle's original onChange did save + refresh AND
								// this.plugin.propertiesManager?.refresh() (toggles the
								// `ui-tweaker-property-minimal` class on rendered properties).
								// plugin.refresh() does NOT call propertiesManager.refresh(), so
								// the override needs to additionally call
								// this.plugin.propertiesManager?.refresh() for this key. Flagged
								// in the report. Kept as a control so it stays searchable.
								name: 'Minimal property icons',
								desc: 'Hide the default property type icon and only show your custom icon.',
								control: { type: 'toggle' as const, key: 'minimalPropertyIcons' },
							},
							{
								name: 'Right-click menu',
								desc: 'Add "Change icon" and "Remove icon" to the property context menu.',
								control: { type: 'toggle' as const, key: 'showPropertyMenuActions' },
							},
						],
					},
					{
						// "Property icons" gets its own declarative group heading so it
						// reads as a distinct section (matching the other pages' group
						// headings) instead of a heading sandwiched inside custom DOM.
						type: 'group' as const,
						heading: 'Property icons',
						items: [
							{
								// Dynamic per-property icon/color list: icon picker modal,
								// native color picker, per-row reset, and an empty state.
								// Genuinely custom UI, reproduced via
								// PropertiesTab.renderPropertyIconsSection (heading supplied
								// by this group). Named render; not surfaced in search.
								name: 'Property icons',
								render: (setting: Setting) => {
									this.hidePropertiesSettingChrome(setting);
									this.propertiesIconsSectionHost = setting.settingEl.createDiv();
									this.propertiesPageTab().renderPropertyIconsSection(this.propertiesIconsSectionHost, false);
								},
							},
						],
					},
				],
			},
			{
				type: 'page' as const,
				name: 'Mobile',
				items: [
					{
						// "Reset to default" affordance reproduced from the imperative
						// tab: clears every mobile key back to its default, persists,
						// and re-applies the UI tweaks. Custom DOM (named render), so it
						// is not surfaced in search. The framework owns re-rendering the
						// control rows, matching the Properties page precedent.
						name: 'Reset to default',
						render: (setting: Setting) => {
							this.hidePropertiesSettingChrome(setting);
							const host = setting.settingEl.createDiv();
							this.renderMobileResetButton(host);
						},
					},
					{
						// No heading here — the sub-page is already named "Mobile", so a
						// "Mobile" group heading would be redundant.
						type: 'group' as const,
						items: [
							{
								name: 'Hide "Mobile chevrons" icon',
								desc: 'Hide "Mobile chevrons" icon (long-press flair) in mobile navbar.',
								control: { type: 'toggle' as const, key: 'mobileChevronsIcon' },
							},
							{
								name: 'Hide "Navigate back" button',
								desc: 'Hide "Navigate back" button in mobile navbar.',
								control: { type: 'toggle' as const, key: 'navigateBackButton' },
							},
							{
								name: 'Hide "Navigate forward" button',
								desc: 'Hide "Navigate forward" button in mobile navbar.',
								control: { type: 'toggle' as const, key: 'navigateForwardButton' },
							},
							{
								name: 'Hide "Quick switcher" button',
								desc: 'Hide "Quick switcher" button in mobile navbar.',
								control: { type: 'toggle' as const, key: 'quickSwitcherButton' },
							},
							{
								name: 'Hide "New tab" button',
								desc: 'Hide "New tab" button in mobile navbar.',
								control: { type: 'toggle' as const, key: 'mobileNewTabButton' },
							},
							{
								name: 'Hide "Open tabs" button',
								desc: 'Hide "Open tabs" button in mobile navbar.',
								control: { type: 'toggle' as const, key: 'openTabButton' },
							},
							{
								name: 'Hide "Ribbon menu" button',
								desc: 'Hide "Ribbon menu" button in mobile navbar.',
								control: { type: 'toggle' as const, key: 'ribbonMenuButton' },
							},
							{
								name: 'Swap mobile new tab icon',
								desc: 'Replace the new tab plus icon with a home button icon in mobile navbar.',
								control: { type: 'toggle' as const, key: 'swapMobileNewTabIcon' },
							},
							{
								name: 'Hide title',
								desc: 'Hide the title in mobile view headers.',
								control: { type: 'toggle' as const, key: 'hideMobileTitle' },
							},
							{
								name: 'Hide sync icon',
								desc: 'Hide sync status icons in mobile interface.',
								control: { type: 'toggle' as const, key: 'hideMobileSyncIcon' },
							},
							{
								name: 'Hide status bar',
								desc: 'Hide the status bar on mobile devices.',
								control: { type: 'toggle' as const, key: 'hideStatusBarMobile' },
							},
							{
								name: 'Replace sync button with custom action',
								desc: 'Replace the sync button in the mobile sidebar with a custom icon and command. This will hide the original sync button and show your custom button instead.',
								control: { type: 'toggle' as const, key: 'syncButtonReplacement.enabled' },
							},
							{
								// Command picker (modal) shown only while the replacement
								// is enabled. Custom UI (named render); not searchable. The
								// visible predicate replaces the imperative tab's instant
								// show/hide of this dependent row.
								name: 'Command',
								desc: 'Select the command to execute when the button is clicked',
								visible: () => Boolean(this.plugin.settings.syncButtonReplacement?.enabled),
								render: (setting: Setting) => {
									this.renderSyncButtonCommandControl(setting);
								},
							},
							{
								// Icon picker (modal) shown only while the replacement is
								// enabled. Custom UI (named render); not searchable.
								name: 'Icon',
								desc: 'Select the icon to display on the button',
								visible: () => Boolean(this.plugin.settings.syncButtonReplacement?.enabled),
								render: (setting: Setting) => {
									this.renderSyncButtonIconControl(setting);
								},
							},
						],
					},
					{
						type: 'group' as const,
						heading: 'Mobile navigation menu',
						items: [
							{
								name: '"Navigate back" button position',
								desc: 'Select the position for the "Navigate back" button (default 1).',
								control: { type: 'dropdown' as const, key: 'navigateButtonPosition', options: this.mobilePositionOptions() },
							},
							{
								name: '"Navigate forward" button position',
								desc: 'Select the position for the "Navigate forward" button (default 2).',
								control: { type: 'dropdown' as const, key: 'navigationButtonPosition', options: this.mobilePositionOptions() },
							},
							{
								name: '"Quick switcher" button position',
								desc: 'Select the position for the "Quick switcher" button (default 3).',
								control: { type: 'dropdown' as const, key: 'quickSwitcherPosition', options: this.mobilePositionOptions() },
							},
							{
								name: '"New tab" button position',
								desc: 'Select the position for the "New tab" button (default 4).',
								control: { type: 'dropdown' as const, key: 'newTabPosition', options: this.mobilePositionOptions() },
							},
							{
								name: '"Open tabs" button position',
								desc: 'Select the position for the "Open tabs" button (default 5).',
								control: { type: 'dropdown' as const, key: 'openTabsPosition', options: this.mobilePositionOptions() },
							},
							{
								name: '"Ribbon menu" button position',
								desc: 'Select the position for the "Ribbon menu" button (default 6).',
								control: { type: 'dropdown' as const, key: 'ribbonMenuPosition', options: this.mobilePositionOptions() },
							},
						],
					},
				],
			},
		];
	}

	// Read a control's value, resolving dot-path keys for nested settings.
	getControlValue(key: string): unknown {
		let obj: unknown = this.plugin.settings;
		for (const part of key.split('.')) {
			if (obj == null) return undefined;
			obj = (obj as Record<string, unknown>)[part];
		}
		return obj;
	}

	// Write a control change (dot-path aware), persist, and re-apply the UI
	// tweaks — mirroring TabRenderer.saveSettings (saveSettings + refresh).
	async setControlValue(key: string, value: unknown): Promise<void> {
		const parts = key.split('.');
		let obj = this.plugin.settings as unknown as Record<string, unknown>;
		for (let i = 0; i < parts.length - 1; i++) {
			obj = obj[parts[i]] as Record<string, unknown>;
		}
		obj[parts[parts.length - 1]] = value;
		await this.plugin.saveSettings();
		this.plugin.refresh();
		// Minimal property icons also toggles a class on already-rendered
		// properties via the properties manager, which plugin.refresh() doesn't do.
		if (key === 'minimalPropertyIcons') {
			this.plugin.propertiesManager?.refresh();
		}
	}

	// Lazily-created PropertiesTab backing the declarative "Properties" page.
	// Shared so the reset button and the icons section operate on one instance.
	private propertiesPageTab(): PropertiesTab {
		if (!this.propertiesTabInstance) {
			this.propertiesTabInstance = new PropertiesTab(this.app, this.plugin);
		}
		return this.propertiesTabInstance;
	}

	// Lazily-created StatusBarTab backing the declarative "Status bar" page. The
	// tab re-renders its own host on every list mutation, so one shared instance
	// is enough.
	private statusBarPageTab(): StatusBarTab {
		if (!this.statusBarTabInstance) {
			this.statusBarTabInstance = new StatusBarTab(this.app, this.plugin);
		}
		return this.statusBarTabInstance;
	}

	// Lazily-created TabBarTab backing the declarative "Tab bar" page. The tab
	// re-renders its own host on every list mutation, so one shared instance is
	// enough.
	private tabBarPageTab(): TabBarTab {
		if (!this.tabBarTabInstance) {
			this.tabBarTabInstance = new TabBarTab(this.app, this.plugin);
		}
		return this.tabBarTabInstance;
	}

	// Lazily-created ExplorerTab backing the declarative "Explorer" page. The tab
	// re-renders its own host on every list mutation, so one shared instance is
	// enough.
	private explorerPageTab(): ExplorerTab {
		if (!this.explorerTabInstance) {
			this.explorerTabInstance = new ExplorerTab(this.app, this.plugin);
		}
		return this.explorerTabInstance;
	}

	// Re-render the dynamic "Property Icons" section in place (used after a
	// reset clears the saved property icons).
	private rerenderPropertiesIconsSection(): void {
		if (!this.propertiesIconsSectionHost) return;
		this.propertiesIconsSectionHost.empty();
		this.propertiesPageTab().renderPropertyIconsSection(this.propertiesIconsSectionHost, false);
	}

	// Hide a render def's default name/desc/control row so the custom DOM below
	// stands alone, matching the imperative tab's hidden-setting blocks.
	private hidePropertiesSettingChrome(setting: Setting): void {
		const nameEl = setting.settingEl.querySelector('.setting-item-name');
		const descEl = setting.settingEl.querySelector('.setting-item-description');
		const controlEl = setting.settingEl.querySelector('.setting-item-control');
		if (nameEl) setCssProps(nameEl as HTMLElement, { display: 'none' });
		if (descEl) setCssProps(descEl as HTMLElement, { display: 'none' });
		if (controlEl) setCssProps(controlEl as HTMLElement, { display: 'none' });
		setCssProps(setting.settingEl, { 'border-top': 'none', 'padding-top': '0', 'padding-bottom': '0', display: 'block' });
	}

	// Show/Hide/Reveal visibility states presented as a dropdown, matching the
	// imperative HiderTab's addVisibilitySetting options.
	private visibilityOptions(): Record<string, string> {
		return { show: 'Show', hide: 'Hide', reveal: 'Reveal' };
	}

	// The six mobile navigation positions are presented as a 1-6 dropdown.
	private mobilePositionOptions(): Record<string, string> {
		const options: Record<string, string> = {};
		for (let i = 1; i <= 6; i++) {
			options[String(i)] = String(i);
		}
		return options;
	}

	// All keys the Mobile tab's "Reset to default" button restores, reproduced
	// from MobileTab.render's renderResetButton call.
	private static readonly MOBILE_RESET_KEYS: (keyof typeof DEFAULT_SETTINGS)[] = [
		'mobileChevronsIcon', 'navigateBackButton', 'navigateForwardButton', 'quickSwitcherButton',
		'mobileNewTabButton', 'openTabButton', 'ribbonMenuButton', 'swapMobileNewTabIcon',
		'hideMobileTitle', 'hideMobileSyncIcon', 'hideStatusBarMobile', 'syncButtonReplacement',
		'navigateButtonPosition', 'navigationButtonPosition', 'quickSwitcherPosition',
		'newTabPosition', 'openTabsPosition', 'ribbonMenuPosition',
	];

	// Reproduce the imperative reset button: restore each mobile key to its
	// default, persist, then re-apply the UI tweaks (matching TabRenderer's
	// saveSettings = saveSettings + refresh).
	private renderMobileResetButton(container: HTMLElement): void {
		const resetContainer = container.createDiv('ui-tweaker-reset-container');

		const setting = new Setting(resetContainer);
		setting.setClass('ui-tweaker-reset-setting');
		setting.setName('Reset to default');

		setting.addExtraButton(button => {
			button.setIcon('rotate-ccw')
				.setTooltip('Reset tab to defaults')
				.onClick(async () => {
					// Indexing UISettings with dynamic keys resolves to `never` in
					// strict mode; treat the settings bag as a string-keyed record
					// for the dynamic assignment (runtime shape is correct).
					const settingsBag = this.plugin.settings as unknown as Record<string, unknown>;
					UITweakerSettingTab.MOBILE_RESET_KEYS.forEach(key => {
						settingsBag[key] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[key])) as unknown;
					});
					await this.plugin.saveSettings();
					this.plugin.refresh();
				});
		});
	}

	// All keys the Hider tab's "Reset to default" button restores, reproduced
	// from HiderTab.render's renderResetButton call.
	private static readonly HIDER_RESET_KEYS: (keyof typeof DEFAULT_SETTINGS)[] = [
		'titleBar', 'fileExplorerNavHeader', 'otherNavHeaders', 'leftTabHeaders', 'rightTabHeaders',
		'ribbonRevealOnHover', 'tabBar', 'enableWindowDragging', 'tabBarHideWhenSingle',
		'readingModeButton', 'bookmarkedButton', 'searchSettingsButton', 'vaultSwitcher',
		'helpButton', 'helpButtonReplacement', 'settingsButton', 'vaultSwitcherBackgroundTransparency',
		'tabListIcon', 'newTabIcon', 'tabCloseButton', 'statusBar', 'scrollBars',
		'leftSidebarToggleButton', 'rightSidebarToggleButton', 'tooltips', 'instructions',
		'searchSuggestions', 'searchTermCounts', 'propertiesInReadingView', 'deemphasizeProperties',
		'propertiesInHeading', 'addPropertyButton',
	];

	// Reproduce the imperative reset button: restore each Hider key to its
	// default, persist, then re-apply the UI tweaks (matching TabRenderer's
	// saveSettings = saveSettings + refresh).
	private renderHiderResetButton(container: HTMLElement): void {
		const resetContainer = container.createDiv('ui-tweaker-reset-container');

		const setting = new Setting(resetContainer);
		setting.setClass('ui-tweaker-reset-setting');
		setting.setName('Reset to default');

		setting.addExtraButton(button => {
			button.setIcon('rotate-ccw')
				.setTooltip('Reset tab to defaults')
				.onClick(async () => {
					// Indexing UISettings with dynamic keys resolves to `never` in
					// strict mode; treat the settings bag as a string-keyed record
					// for the dynamic assignment (runtime shape is correct).
					const settingsBag = this.plugin.settings as unknown as Record<string, unknown>;
					UITweakerSettingTab.HIDER_RESET_KEYS.forEach(key => {
						settingsBag[key] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[key])) as unknown;
					});
					await this.plugin.saveSettings();
					this.plugin.refresh();
				});
		});
	}

	// Custom command picker for the help-button replacement. The modal callback
	// persists the chosen command then re-applies the UI tweaks (save + refresh).
	private renderHelpButtonCommandControl(setting: Setting): void {
		const replacement = this.plugin.settings.helpButtonReplacement;
		setting.addButton(button =>
			button.setButtonText(this.syncButtonCommandName(replacement.commandId)).onClick(() => {
				const modal = new CommandPickerModal(this.app, (commandId) => {
					void (async () => {
						replacement.commandId = commandId;
						button.setButtonText(this.syncButtonCommandName(commandId));
						await this.plugin.saveSettings();
						this.plugin.refresh();
					})();
				});
				modal.open();
			})
		);
	}

	// Custom icon picker for the help-button replacement. The modal callback
	// persists the chosen icon then re-applies the UI tweaks (save + refresh).
	private renderHelpButtonIconControl(setting: Setting): void {
		const replacement = this.plugin.settings.helpButtonReplacement;
		setting.addButton(button =>
			button.setButtonText(this.syncButtonIconName(replacement.iconId) || 'Select icon...').onClick(() => {
				const modal = new IconPickerModal(this.app, (iconId) => {
					void (async () => {
						replacement.iconId = iconId;
						button.setButtonText(this.syncButtonIconName(iconId));
						await this.plugin.saveSettings();
						this.plugin.refresh();
					})();
				});
				modal.open();
			})
		);
	}

	// Resolve the display name of the command bound to the sync-button
	// replacement, mirroring renderSyncButtonReplacement's getCommandName.
	private syncButtonCommandName(commandId: string): string {
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
	}

	// Humanize an icon id for display, mirroring renderSyncButtonReplacement's
	// getIconName.
	private syncButtonIconName(iconId: string): string {
		if (!iconId) return '';
		return iconId
			.replace(/^lucide-/, '')
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Custom command picker for the sync-button replacement. The modal callback
	// persists the chosen command then re-applies the UI tweaks (save + refresh).
	private renderSyncButtonCommandControl(setting: Setting): void {
		const replacement = this.plugin.settings.syncButtonReplacement;
		setting.addButton(button =>
			button.setButtonText(this.syncButtonCommandName(replacement.commandId)).onClick(() => {
				const modal = new CommandPickerModal(this.app, (commandId) => {
					void (async () => {
						replacement.commandId = commandId;
						button.setButtonText(this.syncButtonCommandName(commandId));
						await this.plugin.saveSettings();
						this.plugin.refresh();
					})();
				});
				modal.open();
			})
		);
	}

	// Custom icon picker for the sync-button replacement. The modal callback
	// persists the chosen icon then re-applies the UI tweaks (save + refresh).
	private renderSyncButtonIconControl(setting: Setting): void {
		const replacement = this.plugin.settings.syncButtonReplacement;
		setting.addButton(button =>
			button.setButtonText(this.syncButtonIconName(replacement.iconId) || 'Select icon...').onClick(() => {
				const modal = new IconPickerModal(this.app, (iconId) => {
					void (async () => {
						replacement.iconId = iconId;
						button.setButtonText(this.syncButtonIconName(iconId));
						await this.plugin.saveSettings();
						this.plugin.refresh();
					})();
				});
				modal.open();
			})
		);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('ui-tweaker-settings-tab-root');

		this.tabContentMap.clear();
		this.tabButtons.clear();

		const tabs: TabDefinition[] = [
			{ id: 'hider', name: 'Hider', renderer: new HiderTab(this.app, this.plugin) },
			{ id: 'status-bar', name: 'Status bar', renderer: new StatusBarTab(this.app, this.plugin) },
			{ id: 'tab-bar', name: 'Tab bar', renderer: new TabBarTab(this.app, this.plugin) },
			{ id: 'explorer', name: 'Explorer', renderer: new ExplorerTab(this.app, this.plugin) },
			{ id: 'properties', name: 'Properties', renderer: new PropertiesTab(this.app, this.plugin) },
			{ id: 'mobile', name: 'Mobile', renderer: new MobileTab(this.app, this.plugin) }
		];

		const tabsWrapper = containerEl.createDiv('ui-tweaker-settings-tabs');
		const navEl = tabsWrapper.createDiv('ui-tweaker-settings-tabs-nav');
		navEl.setAttribute('role', 'tablist');
		const contentWrapper = tabsWrapper.createDiv('ui-tweaker-settings-tabs-content');

		tabs.forEach(tab => {
			const buttonComponent = new ButtonComponent(navEl);
			buttonComponent.setButtonText(tab.name);
			buttonComponent.removeCta();
			buttonComponent.buttonEl.addClass('ui-tweaker-settings-tab-button');
			buttonComponent.buttonEl.addClass('clickable-icon');
			buttonComponent.buttonEl.setAttribute('role', 'tab');
			buttonComponent.buttonEl.setAttribute('aria-selected', 'false');
			buttonComponent.onClick(() => {
				void this.activateTab(tab.id, tabs, contentWrapper);
			});
			this.tabButtons.set(tab.id, buttonComponent);
		});

		// Activate initial tab
		const initialTabId = this.activeTabId && tabs.some(t => t.id === this.activeTabId)
			? this.activeTabId
			: tabs[0].id;

		void this.activateTab(initialTabId, tabs, contentWrapper);
	}

	private async activateTab(
		id: TabId,
		tabs: TabDefinition[],
		contentWrapper: HTMLElement
	): Promise<void> {
		const definition = tabs.find(tab => tab.id === id);
		if (!definition) return;

		// Lazy load tab content
		if (!this.tabContentMap.has(id)) {
			const tabContainer = contentWrapper.createDiv('ui-tweaker-settings-tab');
			await definition.renderer.render(tabContainer);
			this.tabContentMap.set(id, tabContainer);
		}

		// Deactivate previous tab
		if (this.activeTabId && this.activeTabId !== id) {
			const prevContent = this.tabContentMap.get(this.activeTabId);
			if (prevContent) prevContent.removeClass('is-active');

			const prevButton = this.tabButtons.get(this.activeTabId);
			if (prevButton) {
				prevButton.buttonEl.removeClass('is-active');
				prevButton.buttonEl.setAttribute('aria-selected', 'false');
				prevButton.removeCta();
			}
		}

		// Activate new tab
		const newContent = this.tabContentMap.get(id);
		if (newContent) newContent.addClass('is-active');

		const newButton = this.tabButtons.get(id);
		if (newButton) {
			newButton.buttonEl.addClass('is-active');
			newButton.buttonEl.setAttribute('aria-selected', 'true');
			newButton.setCta();
		}

		this.activeTabId = id;
		contentWrapper.scrollTop = 0;
	}
}
