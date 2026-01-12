/**
 * Explorer Manager - Manages custom command buttons in the file explorer navigation area
 * Based on Commander's ExplorerManager, but with native CSS classes
 */

import { WorkspaceLeaf, setIcon, Menu } from 'obsidian';
import UITweakerPlugin from '../main';
import { CommandIconPair, ExplorerButtonItem } from '../types';
import { isModeActive, isCommandChecked } from '../utils/commandUtils';
import { IconPickerModal } from '../modals/IconPickerModal';
import { setCssProps } from '../uiManager';

export class ExplorerManager {
	private plugin: UITweakerPlugin;
	private buttons: Map<string, HTMLElement> = new Map();
	private observers: MutationObserver[] = [];
	private isReordering = false; // Flag to prevent observer from triggering during reorder

	constructor(plugin: UITweakerPlugin) {
		this.plugin = plugin;
		this.init();
	}

	private init(): void {
		// Wait for workspace to be ready
		this.plugin.app.workspace.onLayoutReady(() => {
			// Initialize items array if needed
			if (!this.plugin.settings.explorerButtonItems) {
				this.plugin.settings.explorerButtonItems = [];
			}

			// Migrate existing explorerCommands if needed
			this.migrateExplorerCommands();

			// Consolidate settings and elements (detect all buttons)
			this.consolidateSettingsAndElements();

			// Set up layout change listener once (like Commander does)
			this.plugin.registerEvent(
				this.plugin.app.workspace.on('layout-change', () => {
					this.consolidateSettingsAndElements();
					this.reorder();
					// Apply native icon overrides after layout changes
					this.applyNativeIconOverrides();
				})
			);
			
			// Add buttons to all existing explorers
			this.addButtonsToAllLeaves();
			
			// Reorder immediately to ensure correct order on startup
			this.reorder();
			
			// Set up mutation observer for external button detection (after explorers are ready)
			setTimeout(() => {
				this.setupMutationObserver();
			}, 100);

			// Register cleanup
			this.plugin.register(() => {
				this.observers.forEach(observer => observer.disconnect());
				this.observers = [];
			});
		});
	}

	private addButtonsToAllLeaves(): void {
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		explorers.forEach((leaf) => {
			this.addButtonsToExplorer(leaf);
		});
	}

	private addButtonsToExplorer(leaf: WorkspaceLeaf): void {
		// Just reorder - it will create missing custom buttons and position everything correctly
		this.reorder();
	}

	/**
	 * Migrate existing explorerCommands to explorerButtonItems
	 */
	public migrateExplorerCommands(): void {
		// ... existing code ...
	}

	private createOrUpdateExplorerButton(container: HTMLElement, pair: CommandIconPair, leaf: WorkspaceLeaf): HTMLElement | null {
		// Check if button already exists (like Commander)
		const existingButton = container.querySelector(`[data-explorer-command-id="${pair.id}"]`) as HTMLElement;
		if (existingButton) {
			// Update existing button
			existingButton.setAttribute('aria-label', pair.name);
			// Apply color only if custom color is set (not black/default)
			if (pair.color && pair.color !== '#000000') {
				existingButton.style.color = pair.color;
			} else {
				existingButton.style.removeProperty('color');
			}
			// Update toggle state
			this.updateButtonToggleState(existingButton, pair);
			return existingButton;
		}

		// Check device mode
		if (!isModeActive(pair.mode, this.plugin)) {
			return null;
		}

		// Create button with native CSS classes (exactly like Commander)
		const button = createDiv({
			cls: 'clickable-icon nav-action-button',
			attr: {
				'data-explorer-command-id': pair.id,
				'aria-label': pair.name,
				'aria-label-position': 'top',
			},
		});

		// Check toggle state and apply icon/class
		this.updateButtonToggleState(button, pair);

		// Click handler
		button.onclick = (): void => {
			const commands = (this.plugin.app as { commands?: { executeCommandById?: (id: string) => Promise<void> } }).commands;
			if (commands?.executeCommandById) {
				// Command execution is tracked by the interceptor in main.ts
				// Just execute the command - the interceptor will handle toggle tracking
				void commands.executeCommandById(pair.id);
				// Update toggle state after command execution
				// The interceptor will also refresh, but we update this button immediately for responsiveness
				setTimeout(() => {
					this.updateButtonToggleState(button, pair);
					// Also update all other buttons for this command
					this.updateAllButtonsForCommand(pair.id);
				}, 100);
			}
		};

		this.buttons.set(pair.id, button);

		// Add context menu (right-click)
		button.addEventListener('contextmenu', (event) => {
			event.stopImmediatePropagation();
			new Menu()
				.addItem((item) => {
					item.setTitle('Change icon')
						.setIcon('lucide-image-plus')
						.onClick(() => {
							const modal = new IconPickerModal(this.plugin.app, (iconId) => {
								if (iconId && iconId !== pair.icon) {
									pair.icon = iconId;
									void this.plugin.saveSettings();
									this.reorder();
								}
							});
							modal.open();
						});
				})
				.addItem((item) => {
					item.setTitle('Delete')
						.setIcon('lucide-trash')
						.onClick(() => {
							void this.removeCommand(pair);
						});
					// Add warning class to make text and icon red
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
					const dom = (item as any).dom;
					if (dom) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
						dom.classList.add('mod-warning');
						// Also make the icon red
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
						const iconEl = dom.querySelector('.menu-item-icon svg');
						if (iconEl) {
							// Use setCssProps to set color (already imported from uiManager)
							setCssProps(iconEl as HTMLElement, { color: 'var(--text-error)' });
						}
					}
				})
				.showAtMouseEvent(event);
		});

		// Append button to container (exactly like Commander)
		container.appendChild(button);
		return button;
	}

	/**
	 * Generate canonical name from button element
	 */
	private generateCanonicalName(element: HTMLElement, ariaLabel: string): string {
		// For native buttons, use the aria-label directly
		const nativeButtonMap: Record<string, string> = {
			'New note': 'newNote',
			'New folder': 'newFolder',
			'Change sort order': 'sortOrder',
			'Auto-reveal current file': 'autoReveal',
			'Collapse all': 'collapseAll',
			'Expand all': 'collapseAll', // Both map to same key
		};
		
		if (nativeButtonMap[ariaLabel]) {
			return `native-${nativeButtonMap[ariaLabel]}`;
		}

		// For custom commands, use command ID
		const commandId = element.getAttribute('data-explorer-command-id');
		if (commandId) {
			return `custom-${commandId}`;
		}

		// For external buttons, use aria-label + class names to generate stable ID
		const allClasses = Array.from(element.classList);
		const ignoredClasses = ['clickable-icon', 'nav-action-button'];
		const stableClasses = allClasses.filter(cls => !ignoredClasses.includes(cls));
		
		// Try to find plugin identifier in classes
		const pluginClass = stableClasses.find(cls => 
			cls.includes('plugin-') || 
			cls.includes('commander') ||
			cls.includes('explorer-focus')
		);

		if (pluginClass) {
			// Use plugin class as base
			const sanitizedAriaLabel = ariaLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
			return `external-${pluginClass}-${sanitizedAriaLabel}`;
		}

		// Fallback: use aria-label
		const sanitized = ariaLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		return `external-${sanitized}`;
	}

	/**
	 * Consolidate settings and elements - detect all buttons and merge with saved items
	 */
	public consolidateSettingsAndElements(): void {
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		if (explorers.length === 0) return;

		// Use first explorer as reference (all explorers should have same buttons)
		const firstExplorer = explorers[0];
		const navButtonsContainer = firstExplorer.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
		if (!navButtonsContainer) return;

		// Get all buttons from DOM (in DOM order)
		const existingButtons = Array.from(navButtonsContainer.querySelectorAll<HTMLElement>('.nav-action-button'));

		// Get saved items from settings
		const savedItems = this.plugin.settings.explorerButtonItems || [];
		const savedItemsMap = new Map(savedItems.map(item => [item.id, item]));
		const matchedSavedIds = new Set<string>();
		const newItems: ExplorerButtonItem[] = [];

		// Track element counts per name pattern
		const elementCount: { [key: string]: number } = {};

		// Process elements in DOM order
		existingButtons.forEach((element) => {
			const ariaLabel = element.getAttribute('aria-label') || '';
			const commandId = element.getAttribute('data-explorer-command-id');
			
			// Generate canonical name and ID
			const canonicalName = this.generateCanonicalName(element, ariaLabel);
			let id = canonicalName;

			// Check if this is a native button (they don't have indices)
			if (canonicalName.startsWith('native-')) {
				// Native buttons have fixed IDs
				id = canonicalName;
			} else if (canonicalName.startsWith('custom-')) {
				// Custom commands have fixed IDs based on command ID
				id = canonicalName;
			} else {
				// External buttons might have multiple instances - add index
				const baseName = canonicalName;
				const count = (baseName in elementCount) ? elementCount[baseName] + 1 : 1;
				elementCount[baseName] = count;
				id = count > 1 ? `${baseName};${count}` : baseName;
			}

			// Check if we have a saved item for this ID
			if (savedItemsMap.has(id)) {
				matchedSavedIds.add(id);
				const savedItem = savedItemsMap.get(id)!;
				// Update name from DOM if it's generic
				if (!savedItem.name || savedItem.name === id || savedItem.name.startsWith('external-')) {
					savedItem.name = ariaLabel || savedItem.name || id;
				}
				// Update ariaLabel if it changed
				if (ariaLabel) {
					savedItem.ariaLabel = ariaLabel;
				}
			} else {
				// New item - determine type
				let type: 'native' | 'external' | 'custom';
				if (canonicalName.startsWith('native-')) {
					type = 'native';
				} else if (canonicalName.startsWith('custom-')) {
					type = 'custom';
				} else {
					type = 'external';
				}

				// Create new item
				const newItem: ExplorerButtonItem = {
					id: id,
					name: ariaLabel || id,
					ariaLabel: ariaLabel,
					type: type,
					commandId: commandId || undefined,
					hidden: false,
				};

				// For custom commands, copy properties from explorerCommands
				if (type === 'custom' && commandId) {
					const existingCommand = this.plugin.settings.explorerCommands.find(c => c.id === commandId);
					if (existingCommand) {
						newItem.icon = existingCommand.icon;
						newItem.displayName = existingCommand.displayName;
						newItem.mode = existingCommand.mode;
						newItem.color = existingCommand.color;
						newItem.showOnFileTypes = existingCommand.showOnFileTypes;
						newItem.hideOnFileTypes = existingCommand.hideOnFileTypes;
						newItem.toggleIcon = existingCommand.toggleIcon;
						newItem.useActiveClass = existingCommand.useActiveClass;
					}
				}

				newItems.push(newItem);
			}
		});

		// Add new items to settings
		if (newItems.length > 0) {
			this.plugin.settings.explorerButtonItems.push(...newItems);
			void this.plugin.saveSettings();
		}
	}

	/**
	 * Set up mutation observer to detect new external buttons
	 */
	private setupMutationObserver(): void {
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		if (explorers.length === 0) return;

		// Set up observer for each explorer
		explorers.forEach((explorer) => {
			const navButtonsContainer = explorer.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
			if (!navButtonsContainer) return;

			let observerTimeout: ReturnType<typeof setTimeout> | null = null;
			const observer = new MutationObserver((mutations) => {
				if (this.isReordering) return;

				// Only trigger if there are actually new nodes added (not just reordered)
				const hasNewNodes = mutations.some(mutation => 
					mutation.addedNodes.length > 0 && 
					Array.from(mutation.addedNodes).some(node => 
						node instanceof HTMLElement && 
						node.classList.contains('nav-action-button') &&
						!node.hasAttribute('data-explorer-command-id') // Only external buttons (not our custom ones)
					)
				);

				if (!hasNewNodes) return; // Skip if no new external buttons

				if (observerTimeout) {
					clearTimeout(observerTimeout);
				}
				observerTimeout = setTimeout(() => {
					if (!this.isReordering) {
						this.consolidateSettingsAndElements();
						this.reorder();
					}
				}, 1000); // Longer debounce to prevent flickering
			});

			observer.observe(navButtonsContainer, { childList: true, subtree: false });
			this.observers.push(observer);
		});
	}

	/**
	 * Reorder buttons based on settings order
	 */
	public reorder(): void {
		this.isReordering = true;
		
		// Disconnect observers temporarily to prevent flickering
		this.observers.forEach(observer => observer.disconnect());
		
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		explorers.forEach((leaf) => {
			const navButtonsContainer = leaf.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
			if (!navButtonsContainer) return;

			// Get all buttons
			const allButtons = Array.from(navButtonsContainer.querySelectorAll<HTMLElement>('.nav-action-button'));
			const buttonMap = new Map<string, HTMLElement>();

			// Map buttons by ID
			allButtons.forEach((button) => {
				const ariaLabel = button.getAttribute('aria-label') || '';
				const canonicalName = this.generateCanonicalName(button, ariaLabel);
				
				// For native buttons, use canonical name directly
				if (canonicalName.startsWith('native-')) {
					buttonMap.set(canonicalName, button);
				} else if (canonicalName.startsWith('custom-')) {
					buttonMap.set(canonicalName, button);
				} else {
					// For external buttons, try to match by ID
					const savedItems = this.plugin.settings.explorerButtonItems || [];
					const matchingItem = savedItems.find(item => {
						if (item.id === canonicalName) return true;
						if (item.id.startsWith(canonicalName + ';')) return true;
						// Match by aria-label if ID doesn't match
						return item.ariaLabel === ariaLabel && item.type === 'external';
					});
					if (matchingItem) {
						buttonMap.set(matchingItem.id, button);
					}
				}
			});

			// Reorder based on settings
			const orderedButtons: HTMLElement[] = [];
			const items = this.plugin.settings.explorerButtonItems || [];

			// First, handle hidden buttons (hide them with CSS)
			items.forEach((item) => {
				if (item.hidden) {
					const button = buttonMap.get(item.id);
					if (button) {
						button.classList.add('ui-tweaker-explorer-button-hidden');
						buttonMap.delete(item.id);
					}
				}
			});

			// Then handle visible buttons
			for (const item of items) {
				if (item.hidden) continue;

				const button = buttonMap.get(item.id);
				if (button) {
					// Remove hidden class if it was previously hidden
					button.classList.remove('ui-tweaker-explorer-button-hidden');
					orderedButtons.push(button);
					buttonMap.delete(item.id);
				} else if (item.type === 'custom') {
					// Recreate custom command button
					const commandPair = this.plugin.settings.explorerCommands.find(c => c.id === item.commandId);
					if (commandPair) {
						const newButton = this.createOrUpdateExplorerButton(navButtonsContainer, commandPair, leaf);
						if (newButton) {
							orderedButtons.push(newButton);
						}
					}
				}
			}

			// Remove buttons that are no longer in settings (except native and external)
			buttonMap.forEach((button, id) => {
				const item = items.find(i => i.id === id);
				if (!item && !id.startsWith('native-') && !id.startsWith('external-')) {
					button.remove();
				}
			});

			// Physically reorder DOM elements
			orderedButtons.forEach((button) => {
				if (button.parentElement === navButtonsContainer) {
					navButtonsContainer.appendChild(button);
				}
			});

			// Apply native icon overrides
			this.applyNativeIconOverrides();
		});

		// Reconnect observers after a delay to allow DOM to settle
		setTimeout(() => {
			this.isReordering = false;
			// Clear old observers array (they're already disconnected)
			this.observers = [];
			// Reconnect observers
			this.setupMutationObserver();
		}, 200);
	}

	/**
	 * Update button toggle state (icon or is-active class)
	 */
	private updateButtonToggleState(button: HTMLElement, pair: CommandIconPair): void {
		// Check if toggle is configured
		// If useActiveClass is true, we still need to check toggle state even without toggleIcon
		if (!pair.toggleIcon && !pair.useActiveClass) {
			// No toggle configured - use default icon
			button.empty();
			setIcon(button, pair.icon);
			button.classList.remove('is-active');
			// Apply color only if custom color is set (not black/default)
			if (pair.color && pair.color !== '#000000') {
				button.style.color = pair.color;
			} else {
				button.style.removeProperty('color');
			}
			return;
		}

		// Check if command is currently toggled on
		const isChecked = isCommandChecked(pair.id, this.plugin);

		if (pair.useActiveClass) {
			// Use is-active class instead of icon swap
			// Only update icon if it's different (to avoid unnecessary DOM manipulation)
			const currentIcon = button.querySelector('.svg-icon');
			const iconName = pair.icon.replace('lucide-', '');
			if (!currentIcon || !currentIcon.classList.contains(iconName)) {
				button.empty();
				setIcon(button, pair.icon);
			}
			// Always update is-active class based on toggle state
			if (isChecked) {
				button.classList.add('is-active');
			} else {
				button.classList.remove('is-active');
			}
		} else if (pair.toggleIcon) {
			// Swap icon based on toggle state (only if toggleIcon is set)
			button.empty();
			setIcon(button, isChecked ? pair.toggleIcon : pair.icon);
			button.classList.remove('is-active');
		}

		// Apply color only if custom color is set (not black/default)
		if (pair.color && pair.color !== '#000000') {
			button.style.color = pair.color;
		} else {
			button.style.removeProperty('color');
		}
	}

	/**
	 * Update button names/tooltips for all existing buttons
	 */
	public updateButtonNames(): void {
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		explorers.forEach((leaf) => {
			const navButtonsContainer = leaf.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
			if (!navButtonsContainer) return;

			for (const pair of this.plugin.settings.explorerCommands) {
				const button = navButtonsContainer.querySelector(`[data-explorer-command-id="${pair.id}"]`) as HTMLElement;
				if (button) {
					button.setAttribute('aria-label', pair.name);
					// Update toggle state as well
					this.updateButtonToggleState(button, pair);
				}
			}
		});
	}

	/**
	 * Update all buttons for a specific command ID across all explorers
	 */
	private updateAllButtonsForCommand(commandId: string): void {
		const pair = this.plugin.settings.explorerCommands.find(p => p.id === commandId);
		if (!pair) return;

		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		explorers.forEach((leaf) => {
			const navButtonsContainer = leaf.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
			if (!navButtonsContainer) return;

			const button = navButtonsContainer.querySelector(`[data-explorer-command-id="${commandId}"]`) as HTMLElement;
			if (button) {
				this.updateButtonToggleState(button, pair);
			}
		});
	}

	/**
	 * Refresh toggle states for all buttons
	 */
	public refreshToggleStates(): void {
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		explorers.forEach((leaf) => {
			const navButtonsContainer = leaf.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
			if (!navButtonsContainer) return;

			for (const pair of this.plugin.settings.explorerCommands) {
				const button = navButtonsContainer.querySelector(`[data-explorer-command-id="${pair.id}"]`) as HTMLElement;
				// Refresh if toggleIcon is set OR if useActiveClass is true (both need state updates)
				if (button && (pair.toggleIcon || pair.useActiveClass)) {
					// Always update button state - this will check the actual command state
					this.updateButtonToggleState(button, pair);
				}
			}
		});
	}

	/**
	 * Apply icon overrides to native explorer buttons
	 */
	public applyNativeIconOverrides(): void {
		// Observers are already disconnected during reorder, so no need to set flag here
		
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		const iconOverrides = this.plugin.settings.nativeExplorerButtonIcons;
		
		// Map of aria-labels to default icons and icon keys
		const defaultIcons: Record<string, { icon: string, key: 'newNote' | 'newFolder' | 'sortOrder' | 'autoReveal' | 'collapseAll' }> = {
			'New note': { icon: 'lucide-edit', key: 'newNote' },
			'New folder': { icon: 'lucide-folder-plus', key: 'newFolder' },
			'Change sort order': { icon: 'lucide-sort-asc', key: 'sortOrder' },
			'Auto-reveal current file': { icon: 'lucide-gallery-vertical', key: 'autoReveal' },
			'Collapse all': { icon: 'lucide-chevrons-up-down', key: 'collapseAll' },
		};

		explorers.forEach((leaf) => {
			const navButtonsContainer = leaf.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
			if (!navButtonsContainer) return;

			// Find all native buttons (those without data-explorer-command-id)
			const nativeButtons = navButtonsContainer.querySelectorAll('.nav-action-button:not([data-explorer-command-id])');
			nativeButtons.forEach((button) => {
				const ariaLabel = button.getAttribute('aria-label');
				if (!ariaLabel) return;

				const buttonInfo = defaultIcons[ariaLabel];
				if (!buttonInfo) return;

				const iconKey = buttonInfo.key;
				const iconOverride = iconOverrides?.[iconKey];
				const colorOverrides = this.plugin.settings.nativeExplorerButtonColors;
				const color = colorOverrides?.[iconKey];
				
				// Always update the icon (either override or default)
				button.empty();
				if (iconOverride) {
					// Apply icon override
					setIcon(button as HTMLElement, iconOverride);
				} else {
					// No icon override - restore default icon
					setIcon(button as HTMLElement, buttonInfo.icon);
				}
				
				// Apply color if set
				if (color) {
					(button as HTMLElement).style.color = color;
				} else {
					// Remove inline color - let default CSS handle it
					(button as HTMLElement).style.removeProperty('color');
				}
			});
		});
	}

	/**
	 * Remove a command from explorer
	 */
	public async removeCommand(pair: CommandIconPair): Promise<void> {
		if (!this.plugin.settings.explorerCommands) return;
		const index = this.plugin.settings.explorerCommands.indexOf(pair);
		if (index > -1) {
			this.plugin.settings.explorerCommands.splice(index, 1);
		}
		this.reorder();
		await this.plugin.saveSettings();
	}
}
