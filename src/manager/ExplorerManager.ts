/**
 * Explorer Manager - Manages custom command buttons in the file explorer navigation area
 * Based on Commander's ExplorerManager, but with native CSS classes
 */

import { WorkspaceLeaf, setIcon } from 'obsidian';
import UITweakerPlugin from '../main';
import { CommandIconPair } from '../types';
import { isModeActive, isCommandChecked } from '../utils/commandUtils';

export class ExplorerManager {
	private plugin: UITweakerPlugin;
	private buttons: Map<string, HTMLElement> = new Map();

	constructor(plugin: UITweakerPlugin) {
		this.plugin = plugin;
		this.init();
	}

	private init(): void {
		// Wait for workspace to be ready
		this.plugin.app.workspace.onLayoutReady(() => {
			
			// Set up layout change listener once (like Commander does)
			this.plugin.registerEvent(
				this.plugin.app.workspace.on('layout-change', () => {
					this.addButtonsToAllLeaves();
					// Apply native icon overrides after layout changes
					this.applyNativeIconOverrides();
				})
			);
			
			// Add buttons to all existing explorers
			this.addButtonsToAllLeaves();
		});
	}

	private addButtonsToAllLeaves(): void {
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		explorers.forEach((leaf) => {
			this.addButtonsToExplorer(leaf);
		});
	}

	private addButtonsToExplorer(leaf: WorkspaceLeaf): void {
		// Find the nav-buttons-container (like Commander does)
		const navButtonsContainer = leaf.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
		if (!navButtonsContainer) {
			return;
		}

		// Add buttons for each command
		for (const pair of this.plugin.settings.explorerCommands) {
			this.addExplorerButton(navButtonsContainer, pair, leaf);
		}
	}

	private addExplorerButton(container: HTMLElement, pair: CommandIconPair, leaf: WorkspaceLeaf): void {
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
			return;
		}

		// Check device mode
		if (!isModeActive(pair.mode, this.plugin)) {
			return;
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

		// Append button to container (exactly like Commander)
		container.appendChild(button);
	}

	/**
	 * Reorder buttons based on settings order
	 */
	public reorder(): void {
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		explorers.forEach((leaf) => {
			const navButtonsContainer = leaf.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
			if (!navButtonsContainer) return;

			// Remove all our buttons
			navButtonsContainer.querySelectorAll('[data-explorer-command-id]').forEach(btn => btn.remove());

			// Re-add in order
			for (const pair of this.plugin.settings.explorerCommands) {
				this.addExplorerButton(navButtonsContainer, pair, leaf);
			}
		});
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
		const explorers = this.plugin.app.workspace.getLeavesOfType('file-explorer');
		const iconOverrides = this.plugin.settings.nativeExplorerButtonIcons;
		if (!iconOverrides) return;

		explorers.forEach((leaf) => {
			const navButtonsContainer = leaf.view?.containerEl?.querySelector('div.nav-buttons-container') as HTMLElement;
			if (!navButtonsContainer) return;

			// Map of aria-labels to icon keys
			const buttonMap: Record<string, 'newNote' | 'newFolder' | 'sortOrder' | 'autoReveal' | 'collapseAll'> = {
				'New note': 'newNote',
				'New folder': 'newFolder',
				'Change sort order': 'sortOrder',
				'Auto-reveal current file': 'autoReveal',
				'Collapse all': 'collapseAll',
			};

			// Find all native buttons (those without data-explorer-command-id)
			const nativeButtons = navButtonsContainer.querySelectorAll('.nav-action-button:not([data-explorer-command-id])');
			nativeButtons.forEach((button) => {
				const ariaLabel = button.getAttribute('aria-label');
				if (!ariaLabel) return;

				const iconKey = buttonMap[ariaLabel];
				if (!iconKey) return;

				const iconOverride = iconOverrides[iconKey];
				const colorOverrides = this.plugin.settings.nativeExplorerButtonColors;
				const color = colorOverrides?.[iconKey];
				
				if (iconOverride) {
					// Apply icon override
					button.empty();
					setIcon(button as HTMLElement, iconOverride);
					// Apply color if set (directly to button since CSS selector won't match custom icon)
					if (color) {
						(button as HTMLElement).style.color = color;
					} else {
						(button as HTMLElement).style.removeProperty('color');
					}
				} else {
					// Remove override - restore original icon
					// We need to identify which button this is and restore its original icon
					const originalIcons: Record<string, string> = {
						'New note': 'lucide-edit',
						'New folder': 'lucide-folder-plus',
						'Change sort order': 'lucide-sort-asc',
						'Auto-reveal current file': 'lucide-gallery-vertical',
						'Collapse all': 'lucide-chevrons-up-down', // May vary, but this is the default
					};
					const originalIcon = originalIcons[ariaLabel];
					if (originalIcon) {
						button.empty();
						setIcon(button as HTMLElement, originalIcon);
						// Remove inline color - let CSS handle it for original icons
						(button as HTMLElement).style.removeProperty('color');
					}
				}
			});
		});
	}
}
