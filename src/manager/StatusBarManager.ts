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
				if (this.observer) {
					this.observer.disconnect();
				}
				this.customActions.forEach((action) => action.remove());
				this.customActions.clear();
			});
		});
	}

	/**
	 * Consolidate settings and elements (EXACTLY like Status Bar Organizer)
	 * Merges saved items with current DOM elements, preserves order and settings
	 * Saves immediately to prevent duplicates
	 */
	private consolidateSettingsAndElements(): void {
		if (!this.container) return;

		const ignoredClasses = ['mod-clickable', 'status-bar-item', 'ui-tweaker-status-bar-item', 'ui-tweaker-status-bar-hidden'];
		
		// Get all existing status bar elements from DOM
		const existingElements = Array.from(this.container.children).filter(
			el => el.classList.contains('status-bar-item') && !el.classList.contains('ui-tweaker-status-bar-item')
		) as HTMLElement[];

		// Get saved items from settings (preserve ALL saved items, even if not currently visible)
		const savedItems = this.items.filter(item => item.type === 'existing');
		
		// Create a map of saved items by ID for quick lookup
		const savedItemsMap = new Map(savedItems.map(item => [item.id, item]));

		// Track which saved items we've matched to DOM elements
		const matchedSavedIds = new Set<string>();
		const newItems: StatusBarItem[] = [];

		// FIRST PASS: Match elements that already have IDs
		existingElements.forEach((element) => {
			const existingId = element.getAttribute('data-ui-tweaker-status-bar-id');
			if (existingId && savedItemsMap.has(existingId)) {
				// Element has ID and it's in saved items - matched!
				matchedSavedIds.add(existingId);
				return;
			}
		});

		// SECOND PASS: For elements without IDs, generate ID from class names FIRST
		// Then check if that ID (or similar) exists in saved items
		existingElements.forEach((element) => {
			// Skip if already matched
			const existingId = element.getAttribute('data-ui-tweaker-status-bar-id');
			if (existingId && matchedSavedIds.has(existingId)) {
				return;
			}

			// Generate ID from class names (like Status Bar Organizer does FIRST)
			const name = Array.from(element.classList)
				.filter(cls => !ignoredClasses.includes(cls))
				.join('-') || 'status-bar-item';
			
			// Find all saved items with this name pattern
			const matchingSavedItems = savedItems.filter(item => item.id.startsWith(name + ';'));
			
			// If we have saved items with this name pattern, try to match
			if (matchingSavedItems.length > 0) {
				// Find the first unmatched saved item with this name pattern
				for (const savedItem of matchingSavedItems) {
					if (matchedSavedIds.has(savedItem.id)) continue;
					
					// Match this element to the saved item - use the saved item's ID
					element.setAttribute('data-ui-tweaker-status-bar-id', savedItem.id);
					matchedSavedIds.add(savedItem.id);
					return; // Matched, done with this element
				}
			}

			// No match found - this is a truly new element
			// Generate new ID with next available index
			let maxIndex = 0;
			for (const savedItem of savedItems) {
				if (savedItem.id.startsWith(name + ';')) {
					const match = savedItem.id.match(/;(\d+)$/);
					if (match) {
						maxIndex = Math.max(maxIndex, parseInt(match[1], 10));
					}
				}
			}
			
			const indexNum = maxIndex + 1;
			const id = `${name};${indexNum}`;
			element.setAttribute('data-ui-tweaker-status-bar-id', id);

			// Get element name for display
			const elementName = element.getAttribute('aria-label') || 
				element.getAttribute('title') ||
				element.textContent?.trim() || 
				id.split(';')[0] || 'Status bar item';

			// Truly new item - create default entry
			newItems.push({
				id: id,
				name: elementName,
				type: 'existing',
				hidden: false,
				mdOnly: false,
			});
		});

		// Add new items to settings (preserve existing items that aren't currently visible)
		if (newItems.length > 0) {
			this.plugin.settings.statusBarItems.push(...newItems);
			// Save immediately to prevent duplicates
			void this.plugin.saveSettings();
		}

		// Items in settings but not currently visible are kept (like Status Bar Organizer)
		// They'll show up in the UI but marked as "not currently visible"
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
			cls: 'ui-tweaker-status-bar-item status-bar-item clickable-icon',
			attr: { 
				'aria-label': item.name,
				'data-tooltip-position': 'top',
				'data-ui-tweaker-status-bar-id': item.id,
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
						.setIcon('box')
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

		const item: StatusBarItem = {
			id: `custom-${pair.id}`,
			name: pair.name,
			displayName: pair.displayName,
			icon: pair.icon,
			type: 'custom',
			hidden: false,
			mdOnly: pair.mdOnly ?? false,
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
