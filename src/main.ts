/**
 * Main plugin file
 */

import { Plugin, Notice, setIcon, Platform } from 'obsidian';
import { UISettings, DEFAULT_SETTINGS } from './settings';
import { UIManager, setCssProps } from './uiManager';
import { registerCommands } from './commands';
import { UITweakerSettingTab } from './ui/SettingsTab';
import { TabBarManager } from './manager/TabBarManager';
import { StatusBarManager } from './manager/StatusBarManager';
import { ExplorerManager } from './manager/ExplorerManager';
import { recordCommandExecution } from './utils/commandUtils';

export default class UITweakerPlugin extends Plugin {
	settings: UISettings;
	private uiManager: UIManager;
	private customHelpButton?: HTMLElement;
	private helpButtonObserver?: MutationObserver;
	private customSyncButton?: HTMLElement;
	private syncButtonObserver?: MutationObserver;
	private originalSyncButton?: HTMLElement; // Store original to restore later
	private isUpdatingSyncButton: boolean = false; // Prevent infinite loops
	private settingTab?: UITweakerSettingTab;
	public tabBarManager?: TabBarManager;
	public statusBarManager?: StatusBarManager;
	public explorerManager?: ExplorerManager;

	async onload() {
		await this.loadSettings();

		// Initialize UI manager
		this.uiManager = new UIManager(this.settings);
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

		// Register commands
		registerCommands({
			plugin: this,
			settings: this.settings,
			saveSettings: () => this.saveSettings(),
			refresh: () => this.refresh(),
		});

		// Set up command execution interceptor and periodic refresh for button toggle states
		this.setupToggleStateRefresh();
		
		// Set up periodic refresh to catch commands executed outside the interceptor
		// (e.g., keyboard shortcuts that bypass executeCommandById)
		// Only refresh if we have toggle commands configured
		this.registerInterval(
			window.setInterval(() => {
				const hasToggleCommands = 
					(this.settings.explorerCommands?.some(p => p.toggleIcon) ?? false) ||
					(this.settings.tabBarCommands?.some(p => p.toggleIcon) ?? false);
				
				if (hasToggleCommands) {
					if (this.explorerManager) {
						this.explorerManager.refreshToggleStates();
					}
					if (this.tabBarManager) {
						this.tabBarManager.refreshToggleStates();
					}
				}
			}, 500) as unknown as number // Refresh every 500ms to keep buttons in sync
		);

		// Register settings tab
		this.settingTab = new UITweakerSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		// Set up help button replacement
		this.setupHelpButtonReplacement();
		
		// Set up sync button replacement (only on mobile)
		if (Platform.isMobile) {
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
		this.restoreHelpButton();
		if (this.helpButtonObserver) {
			this.helpButtonObserver.disconnect();
		}
		this.restoreSyncButton();
		if (this.syncButtonObserver) {
			this.syncButtonObserver.disconnect();
		}
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
				// Migrate old command IDs (remove ui-tweaker: prefix)
				if (this.settings.helpButtonReplacement.commandId?.startsWith('ui-tweaker:')) {
					this.settings.helpButtonReplacement.commandId = this.settings.helpButtonReplacement.commandId.replace(/^ui-tweaker:+/g, '');
					// Save migrated settings
					await this.saveSettings();
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
				// Migrate old command IDs (remove ui-tweaker: prefix)
				if (this.settings.syncButtonReplacement.commandId?.startsWith('ui-tweaker:')) {
					this.settings.syncButtonReplacement.commandId = this.settings.syncButtonReplacement.commandId.replace(/^ui-tweaker:+/g, '');
					// Save migrated settings
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
		this.setupHelpButtonReplacement();
		// Always update sync button CSS to ensure it matches current settings
		this.updateSyncButtonCSS();
		if (Platform.isMobile) {
			this.setupSyncButtonReplacement();
		} else {
			// Make sure class is removed on desktop
			document.body.classList.remove('ui-tweaker-hide-sync-button');
		}
	}

	private setupHelpButtonReplacement() {
		// Only proceed if replacement is enabled
		if (!this.settings.helpButtonReplacement?.enabled) {
			this.restoreHelpButton();
			return;
		}
		
		// Update CSS and button
		this.updateHelpButtonCSS();
		
		// Wait for the DOM to be ready
		const trySetup = () => {
			if (this.settings.helpButtonReplacement?.enabled) {
				void this.updateHelpButton();
			}
		};

		// Try immediately
		trySetup();

		// Also try after a short delay to ensure DOM is ready
		setTimeout(trySetup, 500);

		// Set up observer after initial setup to watch for button recreation
		setTimeout(() => {
			this.setupHelpButtonObserver();
		}, 1000);
	}

	public updateHelpButtonCSS() {
		// Hide help button if either helpButton is set to "hide" OR replacement is enabled
		const shouldHideHelpButton = this.settings.helpButton === 'hide' || this.settings.helpButtonReplacement?.enabled;
		
		// Use CSS class instead of style element
		document.body.classList.toggle('ui-tweaker-hide-help-button', shouldHideHelpButton);
	}

	public async updateHelpButton() {
		// Only proceed if replacement is enabled
		if (!this.settings.helpButtonReplacement?.enabled) {
			this.restoreHelpButton();
			return;
		}
		
		// Temporarily disconnect observer to prevent infinite loops
		if (this.helpButtonObserver) {
			this.helpButtonObserver.disconnect();
		}

		// Ensure we have the latest settings
		await this.loadSettings();

		// Update CSS first (this will hide the help button globally)
		this.updateHelpButtonCSS();

		try {
			// Check if replacement is still enabled
			if (!this.settings.helpButtonReplacement?.enabled) {
				this.restoreHelpButton();
				return;
			}

			// Find the help button
			const vaultActions = document.querySelector('.workspace-drawer-vault-actions');
			if (!vaultActions) {
				// Set up observer to catch it when it appears
				this.setupHelpButtonObserver();
				// Also retry after a short delay
				setTimeout(() => {
					if (this.settings.helpButtonReplacement?.enabled) {
						void this.updateHelpButton();
					}
				}, 500);
				return;
			}

			// Find the help button - it's the first clickable-icon that contains an SVG with class "help"
			const clickableIcons = Array.from(vaultActions.querySelectorAll('.clickable-icon'));
			let helpButton: HTMLElement | null = null;
			
			for (const icon of clickableIcons) {
				const svg = icon.querySelector('svg.help');
				if (svg) {
					helpButton = icon as HTMLElement;
					break;
				}
			}
			
			if (!helpButton) {
				// Set up observer to catch it when it appears
				this.setupHelpButtonObserver();
				// Also retry after a short delay
				setTimeout(() => {
					if (this.settings.helpButtonReplacement?.enabled) {
						void this.updateHelpButton();
					}
				}, 500);
				return;
			}

			// Remove existing custom button if it exists (always recreate to update icon/command)
			if (this.customHelpButton && this.customHelpButton.parentElement && document.body.contains(this.customHelpButton)) {
				this.customHelpButton.remove();
			}
			this.customHelpButton = undefined;

			// Create a new custom button
			const customButton = helpButton.cloneNode(true) as HTMLElement;
			customButton.removeAttribute('aria-label');
			// Add unique identifier to avoid conflicts with other plugins
			customButton.setAttribute('data-ui-tweaker-help-replacement', 'true');
			customButton.classList.add('ui-tweaker-help-replacement');
			
			// Clear any existing click handlers
			customButton.onclick = null;
			
			// Replace the icon using Obsidian's setIcon function
			const iconContainer = customButton.querySelector('svg')?.parentElement || customButton;
			const iconId = this.settings.helpButtonReplacement?.iconId;
			if (iconId) {
				try {
					setIcon(iconContainer, iconId);
				} catch {
					// Error setting icon
				}
			} else {
				try {
					setIcon(iconContainer, 'wrench');
				} catch {
					// Error setting default icon
				}
			}

			// Add our custom click handler
			customButton.addEventListener('click', (evt: MouseEvent) => {
				evt.preventDefault();
				evt.stopPropagation();
				
				const commandId = this.settings.helpButtonReplacement?.commandId;
				if (commandId) {
					void (async () => {
						try {
							// Use type assertion for executeCommandById as it's not in the public API types
							// but is available in the runtime API
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
			}, true); // Use capture phase to ensure we handle it first

			// Insert the custom button right after the original (hidden) button
			helpButton.parentElement?.insertBefore(customButton, helpButton.nextSibling);
			
			// Store reference to custom button
			this.customHelpButton = customButton;
		} finally {
			// Always set up observer after attempting to create button (even if elements weren't found)
			setTimeout(() => {
				if (this.settings.helpButtonReplacement?.enabled) {
					this.setupHelpButtonObserver();
				}
			}, 1000);
		}
	}

	private setupHelpButtonObserver() {
		// Disconnect existing observer if any
		if (this.helpButtonObserver) {
			this.helpButtonObserver.disconnect();
		}

		// Only set up observer if replacement is enabled
		if (!this.settings.helpButtonReplacement?.enabled) {
			return;
		}

		// Note: MutationObserver is manually managed because Obsidian's registerDomEvent
		// doesn't support MutationObserver directly. Cleanup is handled in onunload().
		// Watch for changes to the vault profile area only (more targeted)
		let updateTimeout: number | null = null;
		this.helpButtonObserver = new MutationObserver(() => {
			// Debounce updates to prevent infinite loops
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
			updateTimeout = window.setTimeout(() => {
				// Check if help button was recreated (CSS will hide it, but we need to inject our custom button)
				const vaultActions = document.querySelector('.workspace-drawer-vault-actions');
				if (!vaultActions) return;
				
				// Check if we have a custom button AND it's still in the DOM
				const customButtonExists = this.customHelpButton && 
					this.customHelpButton.parentElement && 
					document.body.contains(this.customHelpButton) &&
					this.customHelpButton.hasAttribute('data-ui-tweaker-help-replacement');
				
				if (!customButtonExists) {
					// Clear stale reference if button was removed
					if (this.customHelpButton && !document.body.contains(this.customHelpButton)) {
						this.customHelpButton = undefined;
					}
					void this.updateHelpButton();
				}
			}, 100);
		});

		// Observe the vault actions area more specifically
		const vaultActions = document.querySelector('.workspace-drawer-vault-actions');
		if (vaultActions) {
			this.helpButtonObserver.observe(vaultActions, {
				childList: true,
				subtree: true,
			});
		}
		
		// Also observe the parent vault profile area
		const vaultProfile = document.querySelector('.workspace-sidedock-vault-profile');
		if (vaultProfile) {
			this.helpButtonObserver.observe(vaultProfile, {
				childList: true,
				subtree: false,
			});
		}
		
		// Add fallback observers if the specific elements don't exist yet
		if (!vaultActions && !vaultProfile) {
			const workspace = document.querySelector('.workspace-split');
			if (workspace) {
				this.helpButtonObserver.observe(workspace, {
					childList: true,
					subtree: true,
				});
			} else {
				// Last resort: observe document body
				this.helpButtonObserver.observe(document.body, {
					childList: true,
					subtree: true,
				});
			}
		}
	}

	private restoreHelpButton() {
		// Only remove CSS class if neither helpButton is set to "hide" nor replacement is enabled
		const shouldHideHelpButton = this.settings.helpButton === 'hide' || this.settings.helpButtonReplacement?.enabled;
		if (!shouldHideHelpButton) {
			document.body.classList.remove('ui-tweaker-hide-help-button');
		}

		// Remove the custom button (only if replacement is disabled)
		if (!this.settings.helpButtonReplacement?.enabled && this.customHelpButton) {
			if (document.body.contains(this.customHelpButton)) {
				this.customHelpButton.remove();
			}
			this.customHelpButton = undefined;
		}
	}

	private setupSyncButtonReplacement() {
		// Always update CSS first (will remove class if disabled)
		this.updateSyncButtonCSS();
		
		// Only proceed if replacement is enabled AND we're on mobile
		if (!this.settings.syncButtonReplacement?.enabled || !Platform.isMobile) {
			this.restoreSyncButton();
			return;
		}
		
		// Wait for the DOM to be ready
		const trySetup = () => {
			if (this.settings.syncButtonReplacement?.enabled) {
				void this.updateSyncButton();
			}
		};

		// Try immediately
		trySetup();

		// Also try after a short delay to ensure DOM is ready
		setTimeout(trySetup, 500);

		// Set up observer after initial setup to watch for button recreation
		setTimeout(() => {
			this.setupSyncButtonObserver();
		}, 1000);
	}

	public updateSyncButtonCSS() {
		// Hide sync button if replacement is enabled AND we're on mobile
		// Use CSS class instead of style element
		const shouldHide = (this.settings.syncButtonReplacement?.enabled ?? false) && Platform.isMobile;
		document.body.classList.toggle('ui-tweaker-hide-sync-button', shouldHide);
	}

	public async updateSyncButton() {
		// Only proceed if replacement is enabled
		if (!this.settings.syncButtonReplacement?.enabled) {
			this.restoreSyncButton();
			return;
		}
		
		// Temporarily disconnect observer to prevent infinite loops
		if (this.syncButtonObserver) {
			this.syncButtonObserver.disconnect();
		}

		// Ensure we have the latest settings
		await this.loadSettings();

		// Update CSS first (this will hide the sync button globally)
		this.updateSyncButtonCSS();

		try {
			// Check if replacement is still enabled
			if (!this.settings.syncButtonReplacement?.enabled) {
				this.restoreSyncButton();
				return;
			}

			// Find the sync button in mobile right drawer header
			// Actual pattern: clickable-icon workspace-drawer-header-icon mod-raised sync-status-icon
			let syncButton: HTMLElement | null = null;
			
			// Search in right drawer header
			const rightDrawer = document.querySelector('.workspace-drawer.mod-right');
			if (rightDrawer) {
				const drawerHeader = rightDrawer.querySelector('.workspace-drawer-header');
				if (drawerHeader) {
					// Look for sync-status-icon class (this is the actual class!)
					syncButton = drawerHeader.querySelector('.sync-status-icon, .workspace-drawer-header-icon.sync-status-icon') as HTMLElement;
					
					// Fallback: look for refresh-cw-off SVG (sync icon in error/paused state)
					if (!syncButton) {
						const clickableIcons = Array.from(drawerHeader.querySelectorAll('.clickable-icon'));
						for (const icon of clickableIcons) {
							const svg = icon.querySelector('svg.refresh-cw-off, svg.refresh-cw');
							if (svg) {
								syncButton = icon as HTMLElement;
								break;
							}
						}
					}
				}
			}
			
			if (!syncButton) {
				// Set up observer to catch it when it appears
				this.setupSyncButtonObserver();
				// Also retry after a short delay
				setTimeout(() => {
					if (this.settings.syncButtonReplacement?.enabled) {
						void this.updateSyncButton();
					}
				}, 500);
				return;
			}

			// Remove existing custom button if it exists (always recreate to update icon/command)
			if (this.customSyncButton && this.customSyncButton.parentElement && document.body.contains(this.customSyncButton)) {
				this.customSyncButton.remove();
			}
			this.customSyncButton = undefined;

			// Create a new custom button (clone preserves all original classes)
			const customButton = syncButton.cloneNode(true) as HTMLElement;
			customButton.removeAttribute('aria-label');
			// Add unique identifier to avoid conflicts with other plugins
			customButton.setAttribute('data-ui-tweaker-sync-replacement', 'true');
			customButton.classList.add('ui-tweaker-sync-replacement');
			
			// Ensure the button is visible (preserve original classes but ensure visibility)
			// The original classes (workspace-drawer-header-icon, clickable-icon, etc.) should be preserved from clone
			
			// Clear any existing click handlers - remove all event listeners
			customButton.onclick = null;
			// Remove any data attributes that might have click handlers
			customButton.removeAttribute('data-command');
			
			// Replace the icon using Obsidian's setIcon function
			// Find the SVG container - it should be directly in the button or in a child
			let iconContainer: HTMLElement | null = null;
			const existingSvg = customButton.querySelector('svg');
			if (existingSvg) {
				iconContainer = existingSvg.parentElement as HTMLElement;
				// Remove the old SVG
				existingSvg.remove();
			} else {
				iconContainer = customButton;
			}
			
			// Ensure icon container has proper display for centering
			if (iconContainer) {
				setCssProps(iconContainer, {
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				});
			}
			
			const iconId = this.settings.syncButtonReplacement?.iconId;
			if (iconId) {
				try {
					setIcon(iconContainer, iconId);
				} catch {
					// Error setting icon
				}
			} else {
				try {
					setIcon(iconContainer, 'wrench');
				} catch {
					// Error setting default icon
				}
			}

			// Insert custom button in place of the original (like help button replacement)
			// Insert right before the original, then hide the original directly
			const parent = syncButton.parentElement;
			if (parent) {
				parent.insertBefore(customButton, syncButton);
			} else {
				// Fallback: just insert after if parent is missing
				syncButton.parentElement?.insertBefore(customButton, syncButton.nextSibling);
			}
			
			// Add our custom click handler AFTER insertion
			// Don't prevent default - let the click happen naturally, just execute our command
			customButton.addEventListener('click', (evt: MouseEvent) => {
				evt.preventDefault();
				evt.stopPropagation();
				
				const commandId = this.settings.syncButtonReplacement?.commandId;
				if (commandId) {
					// For open-settings, execute directly (this works!)
					if (commandId === 'open-settings' || commandId === 'ui-tweaker:open-settings') {
						const settingApi = (this.app as { setting?: { open?: () => void; openTabById?: (id: string) => void } }).setting;
						if (settingApi) {
							settingApi.open?.();
							// Use type assertion for settingTab as it's a private property
							const pluginInstance = this as unknown as { settingTab?: { id?: string } };
							if (pluginInstance.settingTab?.id && settingApi.openTabById) {
								settingApi.openTabById(pluginInstance.settingTab.id);
							}
						}
					} else {
						// For other commands, try executeCommandById
						((this.app as { commands?: { executeCommandById?: (id: string) => Promise<void> } }).commands as { executeCommandById?: (id: string) => Promise<void> })?.executeCommandById?.(commandId).catch((error: unknown) => {
							console.warn('[UI Tweaker] Error executing command:', error);
							new Notice(`Failed to execute command: ${commandId}`);
						});
					}
				}
			}, true); // Use capture phase to ensure we handle it first
			
			// Also add touchstart for mobile - same logic as click
			customButton.addEventListener('touchstart', (evt: TouchEvent) => {
				evt.preventDefault();
				evt.stopPropagation();
				
				const commandId = this.settings.syncButtonReplacement?.commandId;
				if (commandId) {
					// For open-settings, execute directly (this works!)
					if (commandId === 'open-settings' || commandId === 'ui-tweaker:open-settings') {
						const settingApi = (this.app as { setting?: { open?: () => void; openTabById?: (id: string) => void } }).setting;
						if (settingApi) {
							settingApi.open?.();
							// Use type assertion for settingTab as it's a private property
							const pluginInstance = this as unknown as { settingTab?: { id?: string } };
							if (pluginInstance.settingTab?.id && settingApi.openTabById) {
								settingApi.openTabById(pluginInstance.settingTab.id);
							}
						}
					} else {
						// For other commands, try executeCommandById
						((this.app as { commands?: { executeCommandById?: (id: string) => Promise<void> } }).commands as { executeCommandById?: (id: string) => Promise<void> })?.executeCommandById?.(commandId).catch((error: unknown) => {
							console.warn('[UI Tweaker] Error executing command:', error);
							new Notice(`Failed to execute command: ${commandId}`);
						});
					}
				}
			}, true);
			
			// Hide the original button directly (more reliable than CSS selectors)
			setCssProps(syncButton, { display: 'none' });
			// Add data attribute to track it (in case Obsidian recreates it)
			syncButton.setAttribute('data-ui-tweaker-original-sync-hidden', 'true');
			
			// Store reference to original button so we can restore it later
			this.originalSyncButton = syncButton;
			
			// Store reference to custom button
			this.customSyncButton = customButton;
		} finally {
			// Always set up observer after attempting to create button (even if elements weren't found)
			setTimeout(() => {
				if (this.settings.syncButtonReplacement?.enabled) {
					this.setupSyncButtonObserver();
				}
			}, 1000);
		}
	}

	private setupSyncButtonObserver() {
		// Disconnect existing observer if any
		if (this.syncButtonObserver) {
			this.syncButtonObserver.disconnect();
		}

		// Only set up observer if replacement is enabled
		if (!this.settings.syncButtonReplacement?.enabled) {
			return;
		}

		// Note: MutationObserver is manually managed because Obsidian's registerDomEvent
		// doesn't support MutationObserver directly. Cleanup is handled in onunload().
		// Watch for changes to the right sidebar vault actions area
		let updateTimeout: number | null = null;
		this.syncButtonObserver = new MutationObserver(() => {
			// Debounce updates to prevent infinite loops
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
			updateTimeout = window.setTimeout(() => {
				// Check if sync button was recreated (we need to hide it and ensure custom button exists)
				const rightDrawer = document.querySelector('.workspace-drawer.mod-right');
				if (!rightDrawer) return;
				
				// If we have an original button reference, make sure it's still hidden
				if (this.originalSyncButton && document.body.contains(this.originalSyncButton)) {
					setCssProps(this.originalSyncButton, { display: 'none' });
				}
				
				// Also check for any newly created sync buttons that aren't our custom one
				const drawerHeader = rightDrawer.querySelector('.workspace-drawer-header');
				if (drawerHeader) {
					// Target sync-status-icon class (the actual class!)
					const allSyncButtons = Array.from(drawerHeader.querySelectorAll('.sync-status-icon, .workspace-drawer-header-icon.sync-status-icon, .clickable-icon.sync-status-icon'));
					for (const btn of allSyncButtons) {
						const button = btn as HTMLElement;
						// Don't hide our custom replacement button
						if (!button.hasAttribute('data-ui-tweaker-sync-replacement') &&
							!button.hasAttribute('data-ui-tweaker-original-sync-hidden')) {
							// This is a new sync button, hide it
							setCssProps(button, { display: 'none' });
							button.setAttribute('data-ui-tweaker-original-sync-hidden', 'true');
							// Update our reference
							this.originalSyncButton = button;
						}
					}
				}
				
				// Check if we have a custom button AND it's still in the DOM
				const customButtonExists = this.customSyncButton && 
					this.customSyncButton.parentElement && 
					document.body.contains(this.customSyncButton) &&
					this.customSyncButton.hasAttribute('data-ui-tweaker-sync-replacement');
				
				// Only recreate if custom button doesn't exist AND we're not currently updating
				if (!customButtonExists && !this.isUpdatingSyncButton) {
					// Clear stale reference if button was removed
					if (this.customSyncButton && !document.body.contains(this.customSyncButton)) {
						this.customSyncButton = undefined;
					}
					// Set flag to prevent infinite loops
					this.isUpdatingSyncButton = true;
					void this.updateSyncButton().finally(() => {
						this.isUpdatingSyncButton = false;
					});
				}
			}, 100);
		});

		// Observe the right drawer header (where sync button is located)
		const rightDrawer = document.querySelector('.workspace-drawer.mod-right');
		if (rightDrawer) {
			this.syncButtonObserver.observe(rightDrawer, {
				childList: true,
				subtree: true,
			});
			
			// Specifically observe the header
			const drawerHeader = rightDrawer.querySelector('.workspace-drawer-header');
			if (drawerHeader) {
				this.syncButtonObserver.observe(drawerHeader, {
					childList: true,
					subtree: true,
				});
			}
		}
		
		// Add fallback observers if the specific elements don't exist yet
		if (!rightDrawer) {
			const workspace = document.querySelector('.workspace-split.mod-right-split');
			if (workspace) {
				this.syncButtonObserver.observe(workspace, {
					childList: true,
					subtree: true,
				});
			} else {
				// Last resort: observe document body
				this.syncButtonObserver.observe(document.body, {
					childList: true,
					subtree: true,
				});
			}
		}
	}

	/**
	 * Set up command execution interceptor to update button toggle states
	 * This intercepts command execution globally to update buttons when commands are run
	 * from anywhere (command palette, hotkeys, etc.)
	 */
	private setupToggleStateRefresh(): void {
		const commands = (this.app as { commands?: { executeCommandById?: (id: string) => Promise<void> } }).commands;
		if (!commands?.executeCommandById) return;

		// Store original function
		const originalExecute = commands.executeCommandById.bind(commands) as (id: string) => Promise<void>;

		// Wrap executeCommandById to intercept command execution
		// Type assertion needed because we're modifying Obsidian's internal API
		(commands as { executeCommandById: (id: string) => Promise<void> }).executeCommandById = async (id: string): Promise<void> => {
			// Check if this is a command we're tracking
			const isTracked = this.settings.explorerCommands?.some(p => p.id === id && p.toggleIcon) ||
				this.settings.tabBarCommands?.some(p => p.id === id && p.toggleIcon);

			if (isTracked) {
				// Record execution for toggle tracking
				recordCommandExecution(id);

				// Execute the command
				await originalExecute(id);

				// Update button states after a brief delay to allow command to complete
				// Use multiple timeouts to catch commands that take longer to complete
				setTimeout(() => {
					if (this.explorerManager) {
						this.explorerManager.refreshToggleStates();
					}
					if (this.tabBarManager) {
						this.tabBarManager.refreshToggleStates();
					}
				}, 50);
				
				// Also refresh after a longer delay to catch commands that take more time
				setTimeout(() => {
					if (this.explorerManager) {
						this.explorerManager.refreshToggleStates();
					}
					if (this.tabBarManager) {
						this.tabBarManager.refreshToggleStates();
					}
				}, 300);
			} else {
				// Not a tracked command, just execute normally
				await originalExecute(id);
			}
		};
	}

	private restoreSyncButton() {
		// Remove CSS class if replacement is disabled or not on mobile
		if (!this.settings.syncButtonReplacement?.enabled || !Platform.isMobile) {
			document.body.classList.remove('ui-tweaker-hide-sync-button');
		}

		// Remove the custom button (only if replacement is disabled)
		if (!this.settings.syncButtonReplacement?.enabled) {
			if (this.customSyncButton && document.body.contains(this.customSyncButton)) {
				this.customSyncButton.remove();
			}
			this.customSyncButton = undefined;
			
			// Restore the original button's visibility (we hid it with style.display = 'none')
			if (this.originalSyncButton && document.body.contains(this.originalSyncButton)) {
				this.originalSyncButton.style.removeProperty('display');
			}
			this.originalSyncButton = undefined;
		}
	}
}
