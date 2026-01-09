/**
 * Tab Bar Manager - Manages custom command buttons in page headers (tab bar)
 * Based on Commander's PageHeaderManager with md/mdx-only filtering
 */

import { ItemView, Menu, WorkspaceLeaf } from 'obsidian';
import UITweakerPlugin from '../main';
import { CommandIconPair } from '../types';
import { isMarkdownView, isModeActive } from '../utils/commandUtils';
import { IconPickerModal } from '../modals/IconPickerModal';
import { setCssProps } from '../uiManager';

export class TabBarManager {
	private plugin: UITweakerPlugin;
	private buttons = new WeakMap<ItemView, Map<string, HTMLElement>>();

	constructor(plugin: UITweakerPlugin) {
		this.plugin = plugin;
		this.init();
	}

	private get pairs(): CommandIconPair[] {
		return this.plugin.settings.tabBarCommands || [];
	}

	private init(): void {
		this.plugin.register(() => {
			// Remove all buttons on plugin unload
			this.removeButtonsFromAllLeaves();
		});
		
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('layout-change', () => {
				this.addButtonsToAllLeaves();
			})
		);
		
		this.plugin.app.workspace.onLayoutReady(() =>
			setTimeout(() => this.addButtonsToAllLeaves(), 100)
		);
	}

	private addPageHeaderButton(leaf: WorkspaceLeaf, pair: CommandIconPair): void {
		const { id, icon } = pair;
		// Use user-set name for the button tooltip
		const name = pair.name;
		const { view } = leaf;
		if (!(view instanceof ItemView)) {
			return;
		}
		
		const buttons = this.buttonsFor(leaf, true);
		if (!buttons) {
			return;
		}
		
		// If button already exists, update its name and color instead of creating new one
		if (buttons.has(id)) {
			const existingButton = buttons.get(id);
			if (existingButton) {
				// Update tooltip/aria-label with new name
				existingButton.setAttribute('aria-label', name);
				existingButton.setAttribute('title', name);
				// Update color if needed (only if not black - black = default)
				if (pair.color && pair.color !== '#000000') {
					setCssProps(existingButton, { color: pair.color });
				} else {
					existingButton.style.removeProperty('color');
				}
				return;
			}
		}

		// Check md/mdx-only filter
		if (pair.mdOnly && !isMarkdownView(leaf)) {
			return;
		}

		const buttonIcon = view.addAction(icon, name, () => {
			this.plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
			const commands = (this.plugin.app as { commands?: { executeCommandById?: (id: string) => Promise<void> } }).commands;
			if (commands?.executeCommandById) {
				void commands.executeCommandById(id);
			}
		});
		buttons.set(id, buttonIcon);

		buttonIcon.addClasses(['ui-tweaker-tab-bar-button', id]);
		// Only apply color if it's set and not black (black = default)
		if (pair.color && pair.color !== '#000000') {
			setCssProps(buttonIcon, { color: pair.color });
		}

		buttonIcon.addEventListener('contextmenu', (event) => {
			event.stopImmediatePropagation();
			new Menu()
				.addItem((item) => {
					item.setTitle('Change icon')
						.setIcon('box')
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
				})
				.showAtMouseEvent(event);
		});
	}

	private buttonsFor(leaf: WorkspaceLeaf, create = false) {
		if (!(leaf.view instanceof ItemView)) return;
		if (create && !this.buttons.has(leaf.view))
			this.buttons.set(leaf.view, new Map());
		return this.buttons.get(leaf.view);
	}

	private addButtonsToAllLeaves(refresh = false): void {
		requestAnimationFrame(() => {
			this.plugin.app.workspace.iterateAllLeaves((leaf) => {
				this.addButtonsToLeaf(leaf, refresh);
			});
		});
	}

	private removeButtonsFromAllLeaves(): void {
		requestAnimationFrame(() =>
			this.plugin.app.workspace.iterateAllLeaves((leaf) =>
				this.removeButtonsFromLeaf(leaf)
			)
		);
	}

	private addButtonsToLeaf(leaf: WorkspaceLeaf, refresh = false): void {
		if (!(leaf.view instanceof ItemView)) {
			return;
		}
		if (refresh) {
			this.removeButtonsFromLeaf(leaf);
		} else if (this.buttonsFor(leaf)?.size) {
			// View already has buttons and we're not doing a full refresh
			return;
		}
		for (let i = this.pairs.length - 1; i >= 0; i--) {
			const pair = this.pairs[i];
			if (isModeActive(pair.mode, this.plugin)) {
				this.addPageHeaderButton(leaf, pair);
			}
		}
	}

	private removeButtonsFromLeaf(leaf: WorkspaceLeaf) {
		const buttons = this.buttonsFor(leaf);
		if (buttons) {
			for (const button of buttons.values()) button.detach();
			buttons?.clear();
		}
	}

	public reorder(): void {
		this.addButtonsToAllLeaves(true);
	}

	/**
	 * Update button names/tooltips for all existing buttons
	 */
	public updateButtonNames(): void {
		this.plugin.app.workspace.iterateAllLeaves((leaf) => {
			if (!(leaf.view instanceof ItemView)) return;
			const buttons = this.buttonsFor(leaf);
			if (!buttons) return;
			
			for (const [id, button] of buttons.entries()) {
				const pair = this.pairs.find(p => p.id === id);
				if (pair) {
					// Update tooltip/aria-label with current name
					button.setAttribute('aria-label', pair.name);
					button.setAttribute('title', pair.name);
					// Update color if needed
					if (pair.color && pair.color !== '#000000') {
						setCssProps(button, { color: pair.color });
					} else {
						button.style.removeProperty('color');
					}
				}
			}
		});
	}

	public async addCommand(pair: CommandIconPair): Promise<void> {
		if (!this.plugin.settings.tabBarCommands) {
			this.plugin.settings.tabBarCommands = [];
		}
		this.plugin.settings.tabBarCommands.push(pair);
		this.addButtonsToAllLeaves(true);
		await this.plugin.saveSettings();
	}

	public async removeCommand(pair: CommandIconPair): Promise<void> {
		if (!this.plugin.settings.tabBarCommands) return;
		const index = this.plugin.settings.tabBarCommands.indexOf(pair);
		if (index > -1) {
			this.plugin.settings.tabBarCommands.splice(index, 1);
		}
		this.addButtonsToAllLeaves(true);
		await this.plugin.saveSettings();
	}

	public async updateCommand(oldPair: CommandIconPair, newPair: CommandIconPair): Promise<void> {
		if (!this.plugin.settings.tabBarCommands) return;
		const index = this.plugin.settings.tabBarCommands.indexOf(oldPair);
		if (index > -1) {
			this.plugin.settings.tabBarCommands[index] = newPair;
			this.addButtonsToAllLeaves(true);
			await this.plugin.saveSettings();
		}
	}
}
