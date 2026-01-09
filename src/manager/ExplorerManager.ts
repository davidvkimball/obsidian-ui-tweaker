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
		console.debug('[ExplorerManager] init() called. Commands:', this.plugin.settings.explorerCommands.length);
		
		// Wait for workspace to be ready
		this.plugin.app.workspace.onLayoutReady(() => {
			console.debug('[ExplorerManager] Layout ready, setting up buttons');
			
			// Set up layout change listener once (like Commander does)
			this.plugin.registerEvent(
				this.plugin.app.workspace.on('layout-change', () => {
					this.addButtonsToAllLeaves();
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
			console.debug('[ExplorerManager] nav-buttons-container not found');
			return;
		}

		console.debug('[ExplorerManager] Found nav-buttons-container, adding buttons. Commands:', this.plugin.settings.explorerCommands.length);

		// Add buttons for each command
		for (const pair of this.plugin.settings.explorerCommands) {
			this.addExplorerButton(navButtonsContainer, pair, leaf);
		}
	}

	private addExplorerButton(container: HTMLElement, pair: CommandIconPair, leaf: WorkspaceLeaf): void {
		console.debug('[ExplorerManager] addExplorerButton called for:', pair.name, pair.icon, pair.id);
		
		// Check if button already exists (like Commander)
		const existingButton = container.querySelector(`[data-explorer-command-id="${pair.id}"]`) as HTMLElement;
		if (existingButton) {
			console.debug('[ExplorerManager] Button already exists, updating');
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
			console.debug('[ExplorerManager] Skipping - mode not active:', pair.mode);
			return;
		}

		console.debug('[ExplorerManager] Creating button...');
		
		// Create button with native CSS classes (exactly like Commander)
		const button = createDiv({
			cls: 'clickable-icon nav-action-button',
			attr: {
				'data-explorer-command-id': pair.id,
				'aria-label': pair.name,
				'aria-label-position': 'top',
			},
		});

		console.debug('[ExplorerManager] Button created, setting icon:', pair.icon);

		// Check toggle state and apply icon/class
		this.updateButtonToggleState(button, pair);

		// Click handler
		button.onclick = (): void => {
			const commands = (this.plugin.app as { commands?: { executeCommandById?: (id: string) => Promise<void> } }).commands;
			if (commands?.executeCommandById) {
				void commands.executeCommandById(pair.id);
				// Update toggle state after command execution
				setTimeout(() => {
					this.updateButtonToggleState(button, pair);
				}, 100);
			}
		};

		this.buttons.set(pair.id, button);

		console.debug('[ExplorerManager] Appending button to container. Container children before:', container.children.length);
		
		// Append button to container (exactly like Commander)
		container.appendChild(button);
		
		console.debug('[ExplorerManager] Button appended. Container children after:', container.children.length, 'Button:', button);
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
		if (!pair.toggleIcon) {
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
			button.empty();
			setIcon(button, pair.icon);
			if (isChecked) {
				button.classList.add('is-active');
			} else {
				button.classList.remove('is-active');
			}
		} else {
			// Swap icon based on toggle state
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
}
