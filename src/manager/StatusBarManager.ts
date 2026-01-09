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

		// Match Status Bar Organizer's ignored classes exactly
		// But preserve classes that look like plugin identifiers
		const ignoredClasses = ['mod-clickable', 'status-bar-item', 'ui-tweaker-status-bar-item', 'ui-tweaker-status-bar-hidden'];
		
		// Helper to check if a class looks like a plugin identifier
		const isPluginIdentifier = (cls: string): boolean => {
			return cls.includes('plugin-') || 
				cls.includes('obsidian-git') ||
				(cls.includes('-git') && !cls.includes('git-changes-status-bar'));
		};
		
		// Get all existing status bar elements from DOM (in DOM order)
		const existingElements = Array.from(this.container.children).filter(
			el => el.classList.contains('status-bar-item') && !el.classList.contains('ui-tweaker-status-bar-item')
		) as HTMLElement[];

		// Get saved items from settings (preserve ALL saved items, even if not currently visible)
		const savedItems = this.items.filter(item => item.type === 'existing');
		
		// Create a map of saved items by ID for quick lookup
		const savedItemsMap = new Map(savedItems.map(item => [item.id, item]));

		// Track element counts per name pattern (like Status Bar Organizer does)
		const pluginElementCount: { [key: string]: number } = {};
		
		// Track which saved items we've matched to DOM elements
		const matchedSavedIds = new Set<string>();
		const newItems: StatusBarItem[] = [];

		// Process elements in DOM order (single pass, like Status Bar Organizer)
		existingElements.forEach((element) => {
			// Check if element already has an ID
			let id = element.getAttribute('data-ui-tweaker-status-bar-id');
			let name: string;
			let index: number;

			if (id && savedItemsMap.has(id)) {
				// Element has ID and it's in saved items - already matched!
				matchedSavedIds.add(id);
				// Parse the ID to update element count tracking
				const parts = id.split(';');
				const indexStr = parts.pop();
				if (indexStr) {
					index = parseInt(indexStr, 10);
					name = parts.join(';');
					// Update element count tracking
					pluginElementCount[name] = Math.max(
						index,
						name in pluginElementCount ? pluginElementCount[name] : 0
					);
				}
				return;
			}

			// Element doesn't have a valid saved ID - generate one
			// Generate name from class names (like Status Bar Organizer does)
			// First, get ALL classes (before filtering) to check for plugin identifiers
			const allClasses = Array.from(element.classList);
			
			// Check if element has any classes that look like plugin identifiers
			// (e.g., "plugin-obsidian-git", "obsidian-git", etc.)
			const pluginClass = allClasses.find(cls => 
				cls.includes('plugin-') || 
				cls.includes('obsidian-git') ||
				cls.includes('-git') ||
				(cls.startsWith('git-') && cls !== 'git-changes-status-bar')
			);
			
			// Generate name from class names (filter out ignored classes, but preserve plugin identifiers)
			let classBasedName = allClasses
				.filter(cls => !ignoredClasses.includes(cls) || isPluginIdentifier(cls))
				.join('-');
			
			// If we found a plugin class, ensure it's included
			if (pluginClass && !classBasedName.includes(pluginClass)) {
				// Use the plugin class as the base name
				classBasedName = pluginClass + (classBasedName ? '-' + classBasedName : '');
			}
			
			// If we still have no distinguishing classes, use a fallback
			if (!classBasedName || classBasedName === '') {
				// Check for text content that might help identify the element
				const textContent = element.textContent?.trim();
				if (textContent && textContent.length > 0 && textContent.length < 50 && !textContent.includes(':')) {
					// Simple text without colons - could be a branch name or other identifier
					// If it looks like a git branch (short, alphanumeric with dashes/underscores, no spaces)
					const looksLikeBranch = /^[a-z0-9][a-z0-9_-]*$/i.test(textContent) && textContent.length < 30;
					if (looksLikeBranch) {
						// Use plugin-obsidian-git as base name (matches Status Bar Organizer behavior)
						// Sequential numbering will distinguish multiple git items
						name = 'plugin-obsidian-git';
					} else {
						// Other simple text - use as identifier
						const sanitized = textContent
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, '-')
							.replace(/^-+|-+$/g, '');
						if (sanitized) {
							name = `status-bar-item-${sanitized}`;
						} else {
							name = 'status-bar-item';
						}
					}
				} else {
					// No useful text content, use generic name
					name = 'status-bar-item';
				}
			} else {
				name = classBasedName;
			}

			// Check if we can match to an existing saved item with this name pattern
			const matchingSavedItems = savedItems.filter(item => {
				if (matchedSavedIds.has(item.id)) return false;
				const parts = item.id.split(';');
				parts.pop(); // Remove index
				const itemName = parts.join(';');
				return itemName === name;
			});

			if (matchingSavedItems.length > 0) {
				// Match to the first unmatched saved item with this name pattern
				// Use the saved item's ID to preserve its index and all properties (sticky, hidden, etc.)
				const savedItem = matchingSavedItems[0];
				id = savedItem.id;
				matchedSavedIds.add(id);
				
				// Update the saved item's name from DOM if it has changed (but preserve all other properties like sticky)
				// Get element name for display (use text content or aria-label for better names)
				let elementName = element.getAttribute('aria-label') || 
					element.getAttribute('title') ||
					element.textContent?.trim() || 
					null;

				// If we have a meaningful name from content, update saved item's name
				if (elementName && elementName.length > 0 && elementName.length < 100) {
					// Use the content as the name (e.g., "master" for branch display)
					// Update saved item's name but preserve all other properties (sticky, hidden, mdOnly, etc.)
					savedItem.name = elementName;
				} else {
					// Fall back to ID-based name if no meaningful content
					const fallbackName = id.split(';')[0] || 'Status bar item';
					if (!savedItem.name || savedItem.name === fallbackName) {
						savedItem.name = fallbackName;
					}
				}
				
				// Parse the ID to update element count tracking
				const parts = id.split(';');
				const indexStr = parts.pop();
				if (indexStr) {
					index = parseInt(indexStr, 10);
					// Update element count tracking
					pluginElementCount[name] = Math.max(
						index,
						name in pluginElementCount ? pluginElementCount[name] : 0
					);
				}
			} else {
				// No match found - this is a truly new element
				// Assign sequential index based on element count (like Status Bar Organizer)
				index = (name in pluginElementCount) ? pluginElementCount[name] + 1 : 1;
				id = `${name};${index}`;
				
				// Update element count tracking
				pluginElementCount[name] = index;
			}

			// Set the ID on the element
			element.setAttribute('data-ui-tweaker-status-bar-id', id);

			// Get element name for display (use text content or aria-label for better names)
			let elementName = element.getAttribute('aria-label') || 
				element.getAttribute('title') ||
				element.textContent?.trim() || 
				null;

			// If we have a meaningful name from content, enhance it
			if (elementName && elementName.length > 0 && elementName.length < 100) {
				// Use the content as the name (e.g., "master" for branch display)
				// Don't override if it's too long (might be dynamic content)
			} else {
				// Fall back to ID-based name
				elementName = id.split(';')[0] || 'Status bar item';
			}

			// If this is a new item (not in saved items), add it to settings
			if (!savedItemsMap.has(id)) {
				newItems.push({
					id: id,
					name: elementName,
					type: 'existing',
					hidden: false,
					mdOnly: false,
				});
			}
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
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
					const dom = (menuItem as any).dom;
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
