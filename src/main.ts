/**
 * Main plugin file
 */

import { Plugin, Notice, Platform, Command, Editor, MarkdownView, MarkdownFileInfo } from 'obsidian';
import { UISettings, DEFAULT_SETTINGS } from './settings';
import { UIManager } from './uiManager';
import { setCssProps } from './utils/cssUtils';
import { registerCommands } from './commands';
import { UITweakerSettingTab } from './ui/SettingsTab';
import { TabBarManager } from './manager/TabBarManager';
import { StatusBarManager } from './manager/StatusBarManager';
import { ExplorerManager } from './manager/ExplorerManager';
import { recordCommandExecution } from './utils/commandUtils';
import { ButtonReplacer } from './utils/ButtonReplacer';
import { PropertiesManager } from './manager/PropertiesManager';
import MenuManager from './manager/MenuManager';

export default class UITweakerPlugin extends Plugin {
	settings: UISettings;
	private uiManager: UIManager;
	private helpButtonReplacer?: ButtonReplacer;
	private syncButtonReplacer?: ButtonReplacer;
	public settingTab?: UITweakerSettingTab;
	public tabBarManager?: TabBarManager;
	public statusBarManager?: StatusBarManager;
	public explorerManager?: ExplorerManager;
	public propertiesManager?: PropertiesManager;
	public menuManager: MenuManager;

	get isMobile(): boolean {
		return Platform.isMobile ||
			document.body.classList.contains('is-mobile') ||
			document.body.classList.contains('emulate-mobile');
	}

	async onload() {
		await this.loadSettings();

		// Initialize Menu Manager early to catch menus
		this.menuManager = new MenuManager();

		// Initialize UI manager
		this.uiManager = new UIManager(this, this.settings);
		this.uiManager.applyStyles();

		// Initialize Tab Bar Manager
		if (!this.settings.tabBarCommands) {
			this.settings.tabBarCommands = [];
		}
		this.tabBarManager = new TabBarManager(this);

		// Initialize Status Bar Manager
		if (!this.settings.statusBarItems) {
			this.settings.statusBarItems = [];
		}
		this.statusBarManager = new StatusBarManager(this);

		// Initialize Explorer Manager
		if (!this.settings.explorerCommands) {
			this.settings.explorerCommands = [];
		}
		this.explorerManager = new ExplorerManager(this);
		this.propertiesManager = new PropertiesManager(this);

		// Register commands
		registerCommands({
			plugin: this,
			settings: this.settings,
			saveSettings: () => this.saveSettings(),
			refresh: () => this.refresh(),
		});

		// Set up command execution interceptor for toggle state refresh
		this.setupToggleStateRefresh();

		// Set up event-driven toggle state refresh (no polling needed)
		this.setupToggleStateObservers();

		// Register settings tab
		this.settingTab = new UITweakerSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		// Set up help button replacement
		this.setupHelpButtonReplacement();

		// Set up sync button replacement (only on mobile)
		if (this.isMobile) {
			this.setupSyncButtonReplacement();
		} else {
			// Make sure class is removed on desktop
			document.body.classList.remove('ui-tweaker-hide-sync-button');
		}
	}

	onunload() {
		if (this.uiManager) {
			this.uiManager.cleanup();
		}
		if (this.explorerManager) {
			this.explorerManager.cleanup();
		}
		if (this.statusBarManager) {
			this.statusBarManager.cleanup();
		}
		if (this.menuManager) {
			this.menuManager.unload();
		}

		this.helpButtonReplacer?.uninstall();
		this.syncButtonReplacer?.uninstall();

		// Restore wrapped command callbacks
		for (const wrapper of this.wrappedCommands.values()) {
			wrapper.restore();
		}
		this.wrappedCommands.clear();

		// Cleanup CSS classes
		document.body.classList.remove('ui-tweaker-hide-help-button');
		document.body.classList.remove('ui-tweaker-hide-sync-button');
	}

	async loadSettings() {
		try {
			const data = await this.loadData() as Partial<UISettings> | null;
			// Handle corrupted or empty data
			if (!data || typeof data !== 'object' || Array.isArray(data)) {
				this.settings = Object.assign({}, DEFAULT_SETTINGS);
				// Save defaults to fix corrupted file
				await this.saveSettings();
				return;
			}
			this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
			// Ensure helpButtonReplacement structure exists
			if (!this.settings.helpButtonReplacement) {
				this.settings.helpButtonReplacement = {
					enabled: false,
					commandId: '',
					iconId: 'settings-2',
				};
			} else {
				// Ensure iconId is defined even if helpButtonReplacement exists
				if (!this.settings.helpButtonReplacement.iconId) {
					this.settings.helpButtonReplacement.iconId = 'wrench';
				}
			}

			// Ensure syncButtonReplacement structure exists
			if (!this.settings.syncButtonReplacement) {
				this.settings.syncButtonReplacement = {
					enabled: false,
					commandId: '',
					iconId: 'wrench',
				};
			} else {
				// Ensure iconId is defined even if syncButtonReplacement exists
				if (!this.settings.syncButtonReplacement.iconId) {
					this.settings.syncButtonReplacement.iconId = 'wrench';
				}
			}

			// Migrate mdOnly or fileTypeFilter to showOnFileTypes/hideOnFileTypes for tabBarCommands
			if (this.settings.tabBarCommands) {
				let needsSave = false;
				for (const pair of this.settings.tabBarCommands) {
					// Check if old properties exist in the loaded data (for backward compatibility)
					const pairWithOldProps = pair as {
						mdOnly?: boolean;
						fileTypeFilter?: string;
						showOnFileTypes?: string;
						hideOnFileTypes?: string;
					};

					// Skip if already migrated
					if (pair.showOnFileTypes !== undefined || pair.hideOnFileTypes !== undefined) {
						continue;
					}

					// Migrate from mdOnly: true
					if (pairWithOldProps.mdOnly === true && !pair.showOnFileTypes) {
						pair.showOnFileTypes = 'md,mdx';
						delete pairWithOldProps.mdOnly;
						needsSave = true;
					}

					// Migrate from fileTypeFilter (old mixed syntax)
					if (pairWithOldProps.fileTypeFilter && !pair.showOnFileTypes && !pair.hideOnFileTypes) {
						const filter = pairWithOldProps.fileTypeFilter;
						const parts = filter.split(',').map(p => p.trim()).filter(p => p);
						const showTypes: string[] = [];
						const hideTypes: string[] = [];

						for (const part of parts) {
							if (part.startsWith('-')) {
								const ext = part.slice(1).replace(/^\./, '').toLowerCase();
								if (ext) hideTypes.push(ext);
							} else {
								const ext = part.replace(/^\./, '').toLowerCase();
								if (ext) showTypes.push(ext);
							}
						}

						if (showTypes.length > 0) {
							pair.showOnFileTypes = showTypes.join(',');
						}
						if (hideTypes.length > 0) {
							pair.hideOnFileTypes = hideTypes.join(',');
						}

						delete pairWithOldProps.fileTypeFilter;
						needsSave = true;
					}
				}
				if (needsSave) {
					await this.saveSettings();
				}
			}

			// Migrate property icon IDs to lowercase
			if (this.settings.propertyIconItems) {
				let needsSave = false;
				for (const item of this.settings.propertyIconItems) {
					if (item.id !== item.id.toLowerCase()) {
						item.id = item.id.toLowerCase();
						needsSave = true;
					}
				}
				if (needsSave) {
					await this.saveSettings();
				}
			}
		} catch (error) {
			console.error('[UI Tweaker] Failed to load settings:', error);
			// Fall back to defaults if loading fails
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	refresh() {
		if (this.uiManager) {
			this.uiManager.updateSettings(this.settings);
		}
		this.explorerManager?.applyNativeIconOverrides();
		this.setupHelpButtonReplacement();
		// Always update sync button CSS to ensure it matches current settings
		this.updateSyncButtonCSS();
		if (this.isMobile) {
			this.setupSyncButtonReplacement();
		} else {
			// Make sure class is removed on desktop
			document.body.classList.remove('ui-tweaker-hide-sync-button');
			this.syncButtonReplacer?.uninstall();
		}
	}

	private setupHelpButtonReplacement() {
		// Update CSS first
		this.updateHelpButtonCSS();

		if (!this.settings.helpButtonReplacement?.enabled) {
			this.helpButtonReplacer?.uninstall();
			this.helpButtonReplacer = undefined;
			return;
		}

		if (!this.helpButtonReplacer) {
			this.helpButtonReplacer = new ButtonReplacer(
				'.clickable-icon svg.help',
				this.settings.helpButtonReplacement.iconId || 'settings-2',
				() => {
					const commandId = this.settings.helpButtonReplacement?.commandId;
					if (commandId) {
						void (async () => {
							try {
								const commands = (this.app as { commands?: { executeCommandById?: (id: string) => Promise<void> } }).commands;
								if (commands?.executeCommandById) {
									await commands.executeCommandById(commandId);
								} else {
									throw new Error('Command execution not available');
								}
							} catch {
								new Notice(`Failed to execute command: ${commandId}`);
							}
						})();
					}
				},
				{
					survivalObserver: true,
					parentSelector: '.workspace-drawer-vault-actions',
					uniqueId: 'ui-tweaker-help-replacement',
					cssClass: 'ui-tweaker-help-replacement',
					findButton: (parent) => {
						const selectors = [
							'.workspace-drawer-vault-actions .clickable-icon svg.help',
							'.workspace-sidedock-vault-profile .clickable-icon svg.help',
							'.workspace-drawer .clickable-icon svg.help',
							'.clickable-icon svg.help'
						];

						for (const selector of selectors) {
							const svg = document.querySelector(selector);
							if (svg && svg.parentElement) return svg.parentElement as HTMLElement;
						}

						return null;
					}
				}
			);
			this.helpButtonReplacer.install();
		} else {
			this.helpButtonReplacer.uninstall();
			this.helpButtonReplacer = undefined;
			this.setupHelpButtonReplacement();
		}
	}

	public updateHelpButtonCSS() {
		// Hide help button if either helpButton is set to "hide" OR replacement is enabled
		const shouldHideHelpButton = this.settings.helpButton === 'hide' || this.settings.helpButtonReplacement?.enabled;

		// Use CSS class instead of style element
		document.body.classList.toggle('ui-tweaker-hide-help-button', shouldHideHelpButton);
	}

	private setupSyncButtonReplacement() {
		// Update CSS first
		this.updateSyncButtonCSS();

		if (!this.settings.syncButtonReplacement?.enabled || !this.isMobile) {
			this.syncButtonReplacer?.uninstall();
			this.syncButtonReplacer = undefined;
			return;
		}

		if (!this.syncButtonReplacer) {
			this.syncButtonReplacer = new ButtonReplacer(
				'.sync-status-icon',
				this.settings.syncButtonReplacement.iconId || 'wrench',
				() => {
					const commandId = this.settings.syncButtonReplacement?.commandId;
					if (commandId) {
						if (commandId === 'open-settings' || commandId === 'ui-tweaker:open-settings') {
							const settingApi = (this.app as { setting?: { open?: () => void; openTabById?: (id: string) => void } }).setting;
							if (settingApi) {
								settingApi.open?.();
								if (this.settingTab?.id && settingApi.openTabById) {
									settingApi.openTabById(this.settingTab.id);
								}
							}
						} else {
							((this.app as { commands?: { executeCommandById?: (id: string) => Promise<void> } }).commands as { executeCommandById?: (id: string) => Promise<void> })?.executeCommandById?.(commandId).catch((error: unknown) => {
								console.warn('[UI Tweaker] Error executing command:', error);
								new Notice(`Failed to execute command: ${commandId}`);
							});
						}
					}
				},
				{
					survivalObserver: true,
					parentSelector: '.workspace-drawer.mod-right',
					uniqueId: 'ui-tweaker-sync-replacement',
					cssClass: 'ui-tweaker-sync-replacement workspace-drawer-header-icon mod-raised',
					handleTouch: true,
					stripClasses: ['is-failed', 'is-error', 'is-warning', 'mod-error', 'mod-warning'],
					fallbackParentSelector: '.workspace-drawer.mod-right .workspace-drawer-header',
					fallbackInsertBehavior: 'end',
					onAfterInstall: (custom, original) => {
						if (original) {
							setCssProps(original, { display: 'none' });
							original.setAttribute('data-ui-tweaker-original-sync-hidden', 'true');
						}
					},
					onBeforeUninstall: (custom) => {
						const originals = document.querySelectorAll('[data-ui-tweaker-original-sync-hidden]');
						originals.forEach(el => {
							(el as HTMLElement).style.removeProperty('display');
							el.removeAttribute('data-ui-tweaker-original-sync-hidden');
						});
					},
					findButton: (parent) => {
						const drawerHeader = parent.querySelector('.workspace-drawer-header');
						if (!drawerHeader) return null;

						let syncButton = drawerHeader.querySelector('.sync-status-icon') as HTMLElement;
						if (!syncButton) {
							const clickableIcons = Array.from(drawerHeader.querySelectorAll('.clickable-icon'));
							for (const icon of clickableIcons) {
								if (icon.querySelector('svg.refresh-cw-off, svg.refresh-cw')) return icon as HTMLElement;
							}
						}
						return syncButton;
					}
				}
			);
			this.syncButtonReplacer.install();
		} else {
			this.syncButtonReplacer.uninstall();
			this.syncButtonReplacer = undefined;
			this.setupSyncButtonReplacement();
		}
	}

	public updateSyncButtonCSS() {
		// Hide sync button if replacement is enabled AND we're on mobile
		// Use CSS class instead of style element
		const shouldHide = (this.settings.syncButtonReplacement?.enabled ?? false) && this.isMobile;
		document.body.classList.toggle('ui-tweaker-hide-sync-button', shouldHide);
	}

	/**
	 * Set up event-driven observers for toggle state changes
	 * Wraps individual command callbacks to detect execution regardless of trigger method
	 */
	private setupToggleStateObservers(): void {
		const refreshToggleStates = () => {
			if (this.explorerManager) {
				this.explorerManager.refreshToggleStates();
			}
			if (this.tabBarManager) {
				this.tabBarManager.refreshToggleStates();
			}
		};

		// Watch for theme changes on body element (class attribute changes)
		const bodyObserver = new MutationObserver(refreshToggleStates);
		bodyObserver.observe(document.body, {
			attributes: true,
			attributeFilter: ['class']
		});

		// Watch for layout changes (sidebar toggles, panel changes, etc.)
		this.registerEvent(
			this.app.workspace.on('layout-change', refreshToggleStates)
		);

		// Watch for CSS class changes on workspace container (ribbon, sidebars)
		const workspaceEl = document.querySelector('.workspace');
		if (workspaceEl) {
			const workspaceObserver = new MutationObserver(refreshToggleStates);
			workspaceObserver.observe(workspaceEl, {
				attributes: true,
				attributeFilter: ['class']
			});
		}
	}

	// Track wrapped commands to avoid double-wrapping and allow cleanup
	private wrappedCommands: Map<string, { restore: () => void }> = new Map();

	/**
	 * Wrap individual command callbacks to intercept execution
	 * This catches commands triggered via hotkey, palette, or programmatically
	 */
	private setupToggleStateRefresh(): void {
		// Initial wrap of all toggle commands
		this.wrapToggleCommands();
	}

	/**
	 * Wrap callbacks for all toggle commands
	 * Call this when toggle commands are added/removed
	 */
	public wrapToggleCommands(): void {
		const commandsObj = (this.app as { commands?: { commands?: Record<string, Command> } }).commands;
		if (!commandsObj?.commands) return;

		const refreshToggleStates = () => {
			setTimeout(() => {
				if (this.explorerManager) {
					this.explorerManager.refreshToggleStates();
				}
				if (this.tabBarManager) {
					this.tabBarManager.refreshToggleStates();
				}
			}, 50);
		};

		// Get all toggle command IDs
		const toggleCommandIds = new Set<string>();
		this.settings.explorerCommands?.forEach(p => {
			if (p.toggleIcon) toggleCommandIds.add(p.id);
		});
		this.settings.tabBarCommands?.forEach(p => {
			if (p.toggleIcon) toggleCommandIds.add(p.id);
		});

		// Unwrap commands that are no longer toggle commands
		for (const [id, wrapper] of this.wrappedCommands) {
			if (!toggleCommandIds.has(id)) {
				wrapper.restore();
				this.wrappedCommands.delete(id);
			}
		}

		// Wrap new toggle commands
		for (const id of toggleCommandIds) {
			if (this.wrappedCommands.has(id)) continue; // Already wrapped

			const command = commandsObj.commands[id];
			if (!command) continue;

			// Wrap the appropriate callback
			if (command.checkCallback) {
				const original = command.checkCallback;
				command.checkCallback = (checking: boolean) => {
					const result = original(checking);
					if (!checking) {
						recordCommandExecution(id);
						refreshToggleStates();
					}
					return result;
				};
				this.wrappedCommands.set(id, {
					restore: () => { command.checkCallback = original; }
				});
			} else if (command.callback) {
				const original = command.callback;
				command.callback = () => {
					const result = original();
					recordCommandExecution(id);
					refreshToggleStates();
					return result;
				};
				this.wrappedCommands.set(id, {
					restore: () => { command.callback = original; }
				});
			} else if (command.editorCheckCallback) {
				const original = command.editorCheckCallback;
				command.editorCheckCallback = (checking, editor, ctx) => {
					const result = original(checking, editor, ctx);
					if (!checking) {
						recordCommandExecution(id);
						refreshToggleStates();
					}
					return result;
				};
				this.wrappedCommands.set(id, {
					restore: () => { command.editorCheckCallback = original; }
				});
			} else if (command.editorCallback) {
				const original = command.editorCallback;
				command.editorCallback = (editor, ctx) => {
					const result = original(editor, ctx);
					recordCommandExecution(id);
					refreshToggleStates();
					return result;
				};
				this.wrappedCommands.set(id, {
					restore: () => { command.editorCallback = original; }
				});
			}
		}
	}
}
