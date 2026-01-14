/**
 * Status Bar Manager - Unified manager for existing + custom status bar items
 * Combines functionality from Status Bar Organizer (reordering/hiding existing items)
 * and Commander (adding custom commands)
 */

import { Menu, setIcon } from 'obsidian';
import UITweakerPlugin from '../main';
import { StatusBarItem, CommandIconPair } from '../types';
import { isMarkdownView, isModeActive } from '../utils/commandUtils';
import { IconPickerModal } from '../modals/IconPickerModal';
import { setCssProps } from '../uiManager';

export class StatusBarManager {
	private plugin: UITweakerPlugin;
	private customActions = new Map<StatusBarItem, HTMLElement>();
	private container: HTMLElement | null = null;
	private observer?: MutationObserver;
	private isReordering = false; // Flag to prevent observer from triggering during reorder

	private get items(): StatusBarItem[] {
		return this.plugin.settings.statusBarItems || [];
	}

	constructor(plugin: UITweakerPlugin) {
		this.plugin = plugin;
		this.init();
	}

	private init(): void {
		this.plugin.app.workspace.onLayoutReady(() => {
			this.container = (this.plugin.app as { statusBar?: { containerEl?: HTMLElement } }).statusBar?.containerEl ?? null;
			if (!this.container) {
				return;
			}

			// Initialize items array if needed
			if (!this.plugin.settings.statusBarItems) {
				this.plugin.settings.statusBarItems = [];
			}

			// Consolidate settings and elements (like Status Bar Organizer)
			// This merges saved items with current DOM elements and saves immediately
			this.consolidateSettingsAndElements();

			// Apply ordering and visibility
			this.reorder();

			// Watch for new status bar items (like Status Bar Organizer does)
			// Use a debounce to prevent excessive re-renders during settings changes
			let observerTimeout: ReturnType<typeof setTimeout> | null = null;
			this.observer = new MutationObserver(() => {
				// Don't trigger if we're currently reordering (prevents infinite loops)
				if (this.isReordering) {
					return;
				}
				
				// Debounce observer callbacks to prevent excessive updates
				if (observerTimeout) {
					clearTimeout(observerTimeout);
				}
				observerTimeout = setTimeout(() => {
					// Only detect and reorder if we're not in the middle of a reorder operation
					if (!this.isReordering) {
						this.consolidateSettingsAndElements();
						this.reorder();
					}
				}, 200);
			});
			this.observer.observe(this.container, { childList: true, subtree: false });

			// Register cleanup
			this.plugin.register(() => {
				this.cleanup();
			});
		});
	}

	/**
	 * Remove all buttons created by this manager from the DOM
	 */
	public cleanup(): void {
		if (this.observer) {
			this.observer.disconnect();
		}
		this.customActions.forEach((action) => action.remove());
		this.customActions.clear();
		
		// Also clean up any buttons that might have been left behind (orphaned)
		if (this.container) {
			const managedButtons = this.container.querySelectorAll('[data-ui-tweaker-managed="true"]');
			managedButtons.forEach(btn => btn.remove());
			
			// Restore visibility of any hidden native items
			const hiddenItems = this.container.querySelectorAll('.ui-tweaker-status-bar-hidden');
			hiddenItems.forEach(item => item.removeClass('ui-tweaker-status-bar-hidden'));
		}
	}

	/**
	 * Check if a class is a dynamic state class that should be filtered out
	 * Dynamic state classes change based on plugin state (e.g., obsidian-git statusbar states)
	 */
	private isDynamicStateClass(className: string): boolean {
		// Filter out known dynamic state class patterns
		const dynamicPatterns = [
			/-statusbar-(idle|pull|push|commit|message|status|add|conflict|paused|failed-init)$/,
			// Common state classes that shouldn't be part of an element's identity
			/^(is-active|is-loading|is-hidden|is-collapsed|is-selected|is-flashing|mod-active|mod-loading)$/,
			// obsidian-git specific dynamic classes
			/^obsidian-git-statusbar-/,
		];
		return dynamicPatterns.some(pattern => pattern.test(className));
	}

	/**
	 * Generate a canonical name from an element's classes
	 * Filters out dynamic state classes and uses only stable plugin identifiers
	 */
	private generateCanonicalName(element: HTMLElement, allClasses: string[]): string {
		const ignoredClasses = ['mod-clickable', 'status-bar-item', 'ui-tweaker-status-bar-item', 'ui-tweaker-status-bar-hidden'];

		// Extract plugin identifier (stable)
		const pluginClass = allClasses.find(cls => 
			cls.includes('plugin-') || 
			cls.includes('obsidian-git') ||
			cls.includes('-git') ||
			(cls.startsWith('git-') && cls !== 'git-changes-status-bar')
		);

		if (pluginClass) {
			// For obsidian-git, use simplified identifiers to handle dynamic class changes
			if (pluginClass.includes('obsidian-git') || pluginClass.startsWith('git-')) {
				if (allClasses.some(cls => cls.startsWith('obsidian-git-statusbar-'))) return 'plugin-obsidian-git-status';
				if (allClasses.includes('git-changes-status-bar')) return 'plugin-obsidian-git-changes';
				
				// Branch detection (for initial ID generation)
				const textContent = element.textContent?.trim();
				// Robust branch detection: short, alphanumeric with dashes/underscores, no colons
				const looksLikeBranch = textContent && textContent.length > 0 && 
					/^[a-z0-9][a-z0-9._\-/]*$/i.test(textContent) && 
					textContent.length < 30 && 
					!textContent.includes(':') && 
					!/^[0-9]/.test(textContent) &&
					!element.getAttribute('data-ui-tweaker-managed');
				
				if (looksLikeBranch) return 'plugin-obsidian-git-branch';
				
				return 'plugin-obsidian-git';
			}

			// Filter out dynamic state classes and ignored classes
			const stableClasses = allClasses.filter(cls => 
				!this.isDynamicStateClass(cls) && 
				!ignoredClasses.includes(cls) &&
				cls !== pluginClass
			);

			if (stableClasses.length > 0) {
				return `${pluginClass}-${stableClasses.join('-')}`;
			}
			return pluginClass;
		}

		// No plugin identifier found - use filtered classes
		const stableClasses = allClasses.filter(cls => 
			!this.isDynamicStateClass(cls) && 
			!ignoredClasses.includes(cls)
		);

		if (stableClasses.length > 0) {
			return stableClasses.join('-');
		}

		return 'status-bar-item';
	}

	/**
	 * Extract canonical name from a saved ID
	 * Removes the index suffix and filters out dynamic state classes
	 * This handles legacy IDs that might have been created with dynamic classes
	 */
	private getCanonicalNameFromId(id: string): string {
		const parts = id.split(';');
		parts.pop(); // Remove index
		const fullName = parts.join(';');
		
		// For obsidian-git, migration to new stable IDs
		if (fullName.includes('obsidian-git-statusbar-') || fullName === 'plugin-obsidian-git') {
			// Smarter migration: check the saved item's name to distinguish between status and branch
			// This handles cases where old IDs like 'plugin-obsidian-git;2' were used for branches
			const savedItem = this.items.find(i => i.id === id);
			if (savedItem && savedItem.name && 
				/^[a-z0-9][a-z0-9._\-/]*$/i.test(savedItem.name) && 
				savedItem.name.length < 30 && 
				!savedItem.name.includes('plugin-')) {
				return 'plugin-obsidian-git-branch';
			}
			return 'plugin-obsidian-git-status';
		}
		
		// For other cases, try to find plugin identifier in the name
		// Look for "plugin-*" pattern
		const pluginMatch = fullName.match(/^(plugin-[a-z0-9-]+)/i);
		if (pluginMatch) {
			return pluginMatch[1];
		}
		
		// If no plugin identifier found, filter out dynamic state classes
		// This is a fallback for edge cases
		const nameParts = fullName.split('-');
		const filteredParts: string[] = [];
		let skipNext = false;
		
		for (let i = 0; i < nameParts.length; i++) {
			if (skipNext) {
				skipNext = false;
				continue;
			}
			
			// Check if this is part of a statusbar-* dynamic state class
			if (nameParts[i] === 'statusbar' && i < nameParts.length - 1) {
				const nextPart = nameParts[i + 1];
				if (['idle', 'pull', 'push', 'commit', 'message', 'status', 'add', 'conflict', 'paused'].includes(nextPart)) {
					skipNext = true;
					continue;
				}
				if (nextPart === 'failed' && i < nameParts.length - 2 && nameParts[i + 2] === 'init') {
					i += 2; // Skip "failed-init"
					continue;
				}
			}
			
			// Filter out other generic dynamic classes
			if (this.isDynamicStateClass(nameParts[i])) {
				continue;
			}
			
			filteredParts.push(nameParts[i]);
		}
		
		// Return filtered name or original if filtering removed everything
		return filteredParts.length > 0 ? filteredParts.join('-') : fullName;
	}

	/**
	 * Consolidate settings and elements (EXACTLY like Status Bar Organizer)
	 * Merges saved items with current DOM elements, preserves order and settings
	 * Saves immediately to prevent duplicates
	 */
	private consolidateSettingsAndElements(): void {
		if (!this.container) return;

		// Get all existing status bar elements from DOM (in DOM order)
		const existingElements = Array.from(this.container.children).filter(
			el => {
				const element = el as HTMLElement;
				// Ignore our own custom items (they are managed separately)
				if (element.classList.contains('ui-tweaker-status-bar-item')) return false;
				
				// CRITICAL FIX: Ignore orphaned managed buttons (e.g., from deleted data)
				if (element.getAttribute('data-ui-tweaker-managed') === 'true') {
					const id = element.getAttribute('data-ui-tweaker-status-bar-id');
					// If it's a managed button but not in our current items list, ignore it for discovery
					if (!id || !this.items.some(item => item.id === id)) {
						return false;
					}
				}
				
				// Process EVERY child of the status bar (like Status Bar Organizer)
				// Many plugins add clickable icons without the 'status-bar-item' class
				return true;
			}
		) as HTMLElement[];

		// Get saved items from settings (preserve ALL saved items, even if not currently visible)
		const savedItems = this.items.filter(item => item.type === 'existing');
		const savedItemsMap = new Map(savedItems.map(item => [item.id, item]));

		// Track element counts per name pattern (like Status Bar Organizer does)
		const pluginElementCount: { [key: string]: number } = {};
		const matchedSavedIds = new Set<string>();
		const newItems: StatusBarItem[] = [];

		// Process elements in DOM order (single pass, EXACTLY like Status Bar Organizer)
		existingElements.forEach((element) => {
			let id = element.getAttribute('data-ui-tweaker-status-bar-id');
			let canonicalName: string;
			let index: number;

			if (id) {
				// Element already tagged - TRUST THE TAG (like SBO)
				const parsed = this.parseElementId(id);
				canonicalName = parsed.name;
				index = parsed.index;
			} else {
				// New element - generate ID from classes and current DOM order count
				const allClasses = Array.from(element.classList);
				canonicalName = this.generateCanonicalName(element, allClasses);
				index = (canonicalName in pluginElementCount) ? pluginElementCount[canonicalName] + 1 : 1;
				id = `${canonicalName};${index}`;
				element.setAttribute('data-ui-tweaker-status-bar-id', id);
			}

			// Update global count tracking for this scan
			pluginElementCount[canonicalName] = Math.max(index, pluginElementCount[canonicalName] || 0);

			// Check if we have a saved item for this ID
			const savedItem = savedItemsMap.get(id);
			if (savedItem) {
				matchedSavedIds.add(id);
				
				// Update display name if it's generic or if it's a branch (which changes)
				let elementName = element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent?.trim();
				const isBranch = canonicalName === 'plugin-obsidian-git-branch';
				const hasGenericName = !savedItem.name || savedItem.name === canonicalName || savedItem.name === 'Status bar item' || savedItem.name.startsWith('plugin-');

				if (elementName && (isBranch || hasGenericName)) {
					savedItem.name = elementName.substring(0, 50);
				}
			} else {
				// New item found - add to settings
				let elementName = element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent?.trim() || canonicalName;
				newItems.push({
					id: id,
					name: elementName.substring(0, 50),
					type: 'existing',
					hidden: false,
					mdOnly: false,
				});
			}
		});

		// Add new items to settings
		if (newItems.length > 0) {
			this.plugin.settings.statusBarItems.push(...newItems);
			void this.plugin.saveSettings();
		}
	}

	/**
	 * Helper to parse internal ID into name and index
	 */
	private parseElementId(id: string): { name: string, index: number } {
		const parts = id.split(';');
		const indexStr = parts.pop();
		const index = parseInt(indexStr || '1', 10);
		const name = parts.join(';');
		return { name, index };
	}

	/**
	 * Reorder and apply visibility to all status bar items (like Status Bar Organizer)
	 * Handles sticky items (left/right) and items that aren't currently visible
	 * 
	 * Note: Items with the same sticky position maintain their relative order
	 * (e.g., if 3 items are sticky-left, they appear in the order they're in settings)
	 */
	public reorder(): void {
		if (!this.container) return;
		
		// Set flag to prevent observer from triggering during reorder
		this.isReordering = true;

		// Remove all custom actions first
		this.customActions.forEach((action) => action.remove());
		this.customActions.clear();

		// Get all existing status bar items (excluding our custom ones)
		const allExistingElements = Array.from(this.container.children).filter(
			el => el.classList.contains('status-bar-item') && !el.classList.contains('ui-tweaker-status-bar-item')
		) as HTMLElement[];

		// Separate items by sticky position
		const leftSticky: HTMLElement[] = [];
		const rightSticky: HTMLElement[] = [];
		const regular: HTMLElement[] = [];
		const activeLeaf = this.plugin.app.workspace.getMostRecentLeaf();

		// Process items in order from settings
		for (const item of this.items) {
			// Check visibility
			if (item.hidden) {
				// Hide existing items
				if (item.type === 'existing') {
					const element = allExistingElements.find((el) => 
						el.getAttribute('data-ui-tweaker-status-bar-id') === item.id
					);
					if (element) {
						element.addClass('ui-tweaker-status-bar-hidden');
					}
				}
				continue;
			}

			// Check md/mdx-only filter
			if (item.mdOnly && !isMarkdownView(activeLeaf)) {
				// Hide if not markdown view
				if (item.type === 'existing') {
					const element = allExistingElements.find((el) => 
						el.getAttribute('data-ui-tweaker-status-bar-id') === item.id
					);
					if (element) {
						element.addClass('ui-tweaker-status-bar-hidden');
					}
				}
				continue;
			}

			if (item.type === 'custom') {
				// Check if command exists and mode is active
				const commands = (this.plugin.app as { commands?: { commands?: { [id: string]: { id: string } } } }).commands;
				const command = commands?.commands?.[item.commandId || ''];
				const mode = item.mode || 'any';
				if (command && isModeActive(mode, this.plugin)) {
					this.addCustomAction(item);
					const action = this.customActions.get(item);
					if (action) {
						// Add to appropriate list based on sticky position
						if (item.sticky === 'left') {
							leftSticky.push(action);
						} else if (item.sticky === 'right') {
							rightSticky.push(action);
						} else {
							regular.push(action);
						}
					}
				}
			} else {
				// Find existing element (may not exist if plugin isn't loaded)
				const element = allExistingElements.find((el) => 
					el.getAttribute('data-ui-tweaker-status-bar-id') === item.id
				);

				if (element) {
					element.removeClass('ui-tweaker-status-bar-hidden');
					// Add to appropriate list based on sticky position
					if (item.sticky === 'left') {
						leftSticky.push(element);
					} else if (item.sticky === 'right') {
						rightSticky.push(element);
					} else {
						regular.push(element);
					}
				}
				// If element doesn't exist, item is kept in settings but not displayed (like Status Bar Organizer)
			}
		}

		// Combine: left sticky items first, then regular items, then right sticky items
		const orderedElements = [...leftSticky, ...regular, ...rightSticky];

		// Physically reorder DOM elements (like Status Bar Organizer does)
		// This is more reliable than CSS order property
		orderedElements.forEach((element) => {
			if (this.container && element.parentElement === this.container) {
				this.container.appendChild(element);
			}
		});

		// Also set CSS order as backup (in case container uses flexbox)
		orderedElements.forEach((element, index) => {
			setCssProps(element, { order: (index + 1).toString() });
		});
		
		// Clear flag after a short delay to allow DOM to settle
		setTimeout(() => {
			this.isReordering = false;
		}, 50);
	}

	/**
	 * Add a custom command action to the status bar (like Commander)
	 */
	private addCustomAction(item: StatusBarItem): void {
		if (!this.container || !item.commandId) return;

		// Don't create duplicate if already exists
		if (this.customActions.has(item)) return;

		const btn = this.container.createDiv({
			cls: 'ui-tweaker-status-bar-item status-bar-item mod-clickable',
			attr: { 
				'aria-label': item.name,
				'data-tooltip-position': 'top',
				'data-ui-tweaker-status-bar-id': item.id,
				'data-ui-tweaker-managed': 'true',
			},
		});

		if (item.icon) {
			setIcon(btn, item.icon);
		}

		// Apply color if set
		if (item.color && item.color !== '#000000') {
			setCssProps(btn, { color: item.color });
		}

		btn.onclick = (): void => {
			const commands = (this.plugin.app as { commands?: { executeCommandById?: (id: string) => Promise<void> } }).commands;
			if (commands?.executeCommandById && item.commandId) {
				void commands.executeCommandById(item.commandId);
			}
		};

		btn.addEventListener('contextmenu', (event) => {
			event.stopImmediatePropagation();
			new Menu()
				.addItem((menuItem) => {
					menuItem.setTitle('Change icon')
						.setIcon('lucide-image-plus')
						.onClick(() => {
							const modal = new IconPickerModal(this.plugin.app, (iconId) => {
								if (iconId && iconId !== item.icon) {
									item.icon = iconId;
									void this.plugin.saveSettings();
									this.reorder();
								}
							});
							modal.open();
						});
				})
				.addItem((menuItem) => {
					menuItem.setTitle('Delete')
						.setIcon('lucide-trash')
						.onClick(() => {
							void this.removeItem(item);
						});
					// Add warning class to make text and icon red
					const dom = (menuItem as unknown as { dom: HTMLElement }).dom;
					if (dom) {
						dom.classList.add('mod-warning');
						// Also make the icon red
						const iconEl = dom.querySelector('.menu-item-icon svg');
						if (iconEl) {
							// Use setCssProps to set color (already imported from uiManager)
							setCssProps(iconEl as HTMLElement, { color: 'var(--text-error)' });
						}
					}
				})
				.showAtMouseEvent(event);
		});

		this.customActions.set(item, btn);
	}

	/**
	 * Add a new custom command item
	 */
	public async addCustomCommand(pair: CommandIconPair): Promise<void> {
		if (!this.plugin.settings.statusBarItems) {
			this.plugin.settings.statusBarItems = [];
		}

		// Convert showOnFileTypes to mdOnly for StatusBarItem (StatusBarItem still uses mdOnly)
		// If showOnFileTypes includes "md" or "mdx", set mdOnly to true
		const hasMarkdownFilter = pair.showOnFileTypes && 
			(pair.showOnFileTypes.includes('md') || pair.showOnFileTypes.includes('mdx'));
		const mdOnly = hasMarkdownFilter ? true : false;

		const item: StatusBarItem = {
			id: `custom-${pair.id}`,
			name: pair.name,
			displayName: pair.displayName,
			icon: pair.icon,
			type: 'custom',
			hidden: false,
			mdOnly: mdOnly,
			commandId: pair.id,
			color: pair.color,
			mode: pair.mode,
		};

		this.plugin.settings.statusBarItems.push(item);
		this.reorder();
		await this.plugin.saveSettings();
	}

	/**
	 * Remove an item
	 */
	public async removeItem(item: StatusBarItem): Promise<void> {
		if (!this.plugin.settings.statusBarItems) return;
		const index = this.plugin.settings.statusBarItems.indexOf(item);
		if (index > -1) {
			this.plugin.settings.statusBarItems.splice(index, 1);
		}
		this.reorder();
		await this.plugin.saveSettings();
	}

	/**
	 * Update item visibility
	 */
	public async updateItemVisibility(item: StatusBarItem, hidden: boolean): Promise<void> {
		item.hidden = hidden;
		this.reorder();
		await this.plugin.saveSettings();
	}

	/**
	 * Update item md/mdx-only setting
	 */
	public async updateItemMdOnly(item: StatusBarItem, mdOnly: boolean): Promise<void> {
		item.mdOnly = mdOnly;
		this.reorder();
		await this.plugin.saveSettings();
	}

	/**
	 * Update button names/tooltips for all existing custom buttons
	 */
	public updateButtonNames(): void {
		this.customActions.forEach((button, item) => {
			button.setAttribute('aria-label', item.name);
			// Update color if needed
			if (item.color && item.color !== '#000000') {
				setCssProps(button, { color: item.color });
			} else {
				button.style.removeProperty('color');
			}
		});
	}
}
