/**
 * Main plugin file
 */

import { Plugin, Notice, setIcon } from 'obsidian';
import { UISettings, DEFAULT_SETTINGS } from './settings';
import { UIManager } from './uiManager';
import { registerCommands } from './commands';
import { UITweakerSettingTab } from './settingsTab';

export default class UITweakerPlugin extends Plugin {
	settings: UISettings;
	private uiManager: UIManager;
	private helpButtonStyleEl?: HTMLStyleElement;
	private customHelpButton?: HTMLElement;
	private helpButtonObserver?: MutationObserver;
	private settingTab?: any;

	async onload() {
		await this.loadSettings();

		// Initialize UI manager
		this.uiManager = new UIManager(this.settings);
		this.uiManager.applyStyles();

		// Register commands
		registerCommands({
			plugin: this,
			settings: this.settings,
			saveSettings: () => this.saveSettings(),
			refresh: () => this.refresh(),
		});

		// Register settings tab
		this.settingTab = new UITweakerSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		// Set up help button replacement
		this.setupHelpButtonReplacement();
	}

	onunload() {
		if (this.uiManager) {
			this.uiManager.cleanup();
		}
		this.restoreHelpButton();
		if (this.helpButtonObserver) {
			this.helpButtonObserver.disconnect();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// Ensure helpButtonReplacement structure exists
		if (!this.settings.helpButtonReplacement) {
			this.settings.helpButtonReplacement = {
				enabled: false,
				commandId: '',
				iconId: 'settings-2',
			};
		} else {
			// Ensure iconId and commandId are defined even if helpButtonReplacement exists
			if (!this.settings.helpButtonReplacement.iconId) {
				this.settings.helpButtonReplacement.iconId = 'wrench';
			}
			if (!this.settings.helpButtonReplacement.commandId) {
				this.settings.helpButtonReplacement.commandId = 'ui-tweaker:open-settings';
			}
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
				this.updateHelpButton();
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
		// Remove existing style if any
		if (this.helpButtonStyleEl) {
			this.helpButtonStyleEl.remove();
		}

		// Hide help button if either helpButton is set to "hide" OR replacement is enabled
		const shouldHideHelpButton = this.settings.helpButton === 'hide' || this.settings.helpButtonReplacement?.enabled;
		
		if (shouldHideHelpButton) {
			// Create style element to hide help button globally
			this.helpButtonStyleEl = document.createElement('style');
			this.helpButtonStyleEl.id = 'ui-tweaker-hide-help-button';
			this.helpButtonStyleEl.textContent = `
				.workspace-drawer-vault-actions .clickable-icon:has(svg.help) {
					display: none !important;
				}
			`;
			document.head.appendChild(this.helpButtonStyleEl);
		}
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
						this.updateHelpButton();
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
						this.updateHelpButton();
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
			customButton.style.display = '';
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
					setIcon(iconContainer as HTMLElement, iconId);
				} catch (error) {
					console.warn('[UI Tweaker] Error setting icon:', error);
				}
			} else {
				console.warn('[UI Tweaker] Icon ID is undefined, using default "wrench"');
				try {
					setIcon(iconContainer as HTMLElement, 'wrench');
				} catch (error) {
					console.warn('[UI Tweaker] Error setting default icon:', error);
				}
			}

			// Add our custom click handler
			customButton.addEventListener('click', async (evt: MouseEvent) => {
				evt.preventDefault();
				evt.stopPropagation();
				
				const commandId = this.settings.helpButtonReplacement?.commandId;
				if (commandId) {
					try {
						await (this.app as any).commands.executeCommandById(commandId);
					} catch (error) {
						console.warn('[UI Tweaker] Error executing command:', error);
						new Notice(`Failed to execute command: ${commandId}`);
					}
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
					this.updateHelpButton();
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
		// Only remove CSS if neither helpButton is set to "hide" nor replacement is enabled
		const shouldHideHelpButton = this.settings.helpButton === 'hide' || this.settings.helpButtonReplacement?.enabled;
		if (!shouldHideHelpButton && this.helpButtonStyleEl) {
			this.helpButtonStyleEl.remove();
			this.helpButtonStyleEl = undefined;
		}

		// Remove the custom button (only if replacement is disabled)
		if (!this.settings.helpButtonReplacement?.enabled && this.customHelpButton) {
			if (document.body.contains(this.customHelpButton)) {
				this.customHelpButton.remove();
			}
			this.customHelpButton = undefined;
		}
	}
}
