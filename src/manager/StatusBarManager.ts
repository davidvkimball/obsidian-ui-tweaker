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
	 * Check if a class is a dynamic state class that should be filtered out
	 * Dynamic state classes change based on plugin state (e.g., obsidian-git statusbar states)
	 */
	private isDynamicStateClass(className: string): boolean {
		// Filter out known dynamic state class patterns
		const dynamicPatterns = [
			/-statusbar-(idle|pull|push|commit|message|status|add|conflict|paused|failed-init)$/,
			// Add more patterns as needed for other plugins
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
			// Filter out dynamic state classes and ignored classes
			// Keep only stable classes that help identify the element
			const stableClasses = allClasses.filter(cls => 
				!this.isDynamicStateClass(cls) && 
				!ignoredClasses.includes(cls) &&
				cls !== pluginClass // Don't duplicate the plugin class
			);

			// Use plugin identifier as base
			// Only add other stable classes if they provide meaningful distinction
			// For obsidian-git, we want just "plugin-obsidian-git" or "obsidian-git"
			if (stableClasses.length > 0 && !pluginClass.includes('obsidian-git')) {
				// For other plugins, include stable classes if they exist
				return `${pluginClass}-${stableClasses.join('-')}`;
			}
			return pluginClass;
		}

		// No plugin identifier found - use fallback logic
		// Filter out dynamic and ignored classes
		const stableClasses = allClasses.filter(cls => 
			!this.isDynamicStateClass(cls) && 
			!ignoredClasses.includes(cls)
		);

		if (stableClasses.length > 0) {
			return stableClasses.join('-');
		}

		// Fallback: check text content
		const textContent = element.textContent?.trim();
		if (textContent && textContent.length > 0 && textContent.length < 50 && !textContent.includes(':')) {
			const looksLikeBranch = /^[a-z0-9][a-z0-9_-]*$/i.test(textContent) && textContent.length < 30;
			if (looksLikeBranch) {
				return 'plugin-obsidian-git';
			}
			const sanitized = textContent
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '');
			if (sanitized) {
				return `status-bar-item-${sanitized}`;
			}
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
		
		// For obsidian-git, extract just the plugin identifier
		// Handle IDs like "plugin-obsidian-git-obsidian-git-statusbar-idle-..."
		if (fullName.startsWith('plugin-obsidian-git')) {
			return 'plugin-obsidian-git';
		}
		if (fullName.startsWith('obsidian-git')) {
			return 'obsidian-git';
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

		// Track position for each canonical name (for matching by DOM order)
		// Note: We calculate actualDomPosition by counting preceding elements, not using a counter
		// This ensures correct positioning even when consolidateSettingsAndElements is called multiple times

		// Process elements in DOM order (single pass, like Status Bar Organizer)
		existingElements.forEach((element, elementIndex) => {
			// Check if element already has an ID
			let id = element.getAttribute('data-ui-tweaker-status-bar-id');
			let name: string;
			let index: number;

			// Preserve existing ID if it exists and is valid (matches Status Bar Organizer behavior)
			// This ensures elements keep their IDs even when classes change dynamically
			if (id) {
				// Validate ID format (should have name;index pattern)
				const parts = id.split(';');
				if (parts.length >= 2) {
					const indexStr = parts[parts.length - 1];
					if (indexStr && !isNaN(parseInt(indexStr, 10))) {
						// Valid ID format - preserve it
						if (savedItemsMap.has(id)) {
							// Element has ID and it's in saved items - already matched!
							matchedSavedIds.add(id);
							index = parseInt(indexStr, 10);
							name = parts.slice(0, -1).join(';');
							// Update element count tracking
							pluginElementCount[name] = Math.max(
								index,
								name in pluginElementCount ? pluginElementCount[name] : 0
							);
							return;
						} else {
							// ID exists but not in saved items yet - still preserve it
							// This handles cases where ID was set previously but item hasn't been saved
							index = parseInt(indexStr, 10);
							name = parts.slice(0, -1).join(';');
							// Update element count tracking
							pluginElementCount[name] = Math.max(
								index,
								name in pluginElementCount ? pluginElementCount[name] : 0
							);
							// Continue to matching logic below to potentially add to saved items
						}
					} else {
						// Invalid ID format - regenerate
						id = null;
					}
				} else {
					// Invalid ID format - regenerate
					id = null;
				}
			}

			// Element doesn't have a valid saved ID - generate one
			// Generate canonical name from class names (filtering out dynamic state classes)
			const allClasses = Array.from(element.classList);
			const canonicalName = this.generateCanonicalName(element, allClasses);
			name = canonicalName;

			// Get element characteristics for logging
			const elementText = element.textContent?.trim() || '';
			const elementAriaLabel = element.getAttribute('aria-label') || '';
			const elementTitle = element.getAttribute('title') || '';

			// Enhanced matching algorithm:
			// 1. Match by canonical name (ignoring dynamic state class differences)
			// 2. When multiple items have same canonical name, match by DOM position (index in ID)
			let matchingSavedItems = savedItems.filter(item => {
				if (matchedSavedIds.has(item.id)) return false;
				const itemCanonicalName = this.getCanonicalNameFromId(item.id);
				return itemCanonicalName === canonicalName;
			});

			// Calculate position based on how many elements with same canonical name appear before this one
			// This ensures consistent positioning even if consolidateSettingsAndElements is called multiple times
			let actualDomPosition = 1;
			for (let i = 0; i < elementIndex; i++) {
				const prevElement = existingElements[i];
				const prevClasses = Array.from(prevElement.classList);
				const prevCanonicalName = this.generateCanonicalName(prevElement, prevClasses);
				if (prevCanonicalName === canonicalName) {
					actualDomPosition++;
				}
			}


			// If multiple items match by canonical name, match by DOM position first
			// The Nth element in DOM order should match the saved item with index N
			if (matchingSavedItems.length > 1) {
				// First, try to match by exact index position using actualDomPosition
				const positionMatch = matchingSavedItems.find(item => {
					const parts = item.id.split(';');
					const itemIndex = parseInt(parts[parts.length - 1] || '0', 10);
					return itemIndex === actualDomPosition;
				});

				if (positionMatch) {
					matchingSavedItems = [positionMatch];
				} else {
					// If no exact position match, use smarter matching by characteristics
				
				// Determine element type: branch (short simple text) vs main status bar (aria-label, longer text, or dynamic)
				const isBranchLike = elementText && 
					elementText.length < 30 && 
					!elementText.includes(':') && 
					!/^[0-9]/.test(elementText) && // Not starting with numbers (like "0 words")
					!elementAriaLabel; // Branch items typically don't have aria-labels
				
				const isMainStatusBar = elementAriaLabel || 
					(elementText && (elementText.includes(':') || elementText.length > 30));
				
				// Try to match by saved item name/content similarity
				const scoredMatches = matchingSavedItems.map(item => {
					let score = 0;
					const savedName = item.name || '';
					const isSavedNameBranchLike = savedName.length < 20 && 
						!savedName.includes('plugin-') && 
						!savedName.includes('status-bar') &&
						savedName !== 'Status bar item';
					const isSavedNameGeneric = savedName.includes('plugin-') || 
						savedName.includes('status-bar') ||
						savedName === 'Status bar item';
					
					// Strong match: branch-like element with branch-like saved name
					if (isBranchLike && isSavedNameBranchLike) {
						// Check exact or close match
						if (elementText.toLowerCase() === savedName.toLowerCase()) {
							score += 50; // Very strong match
						} else if (elementText.toLowerCase().includes(savedName.toLowerCase()) || 
						           savedName.toLowerCase().includes(elementText.toLowerCase())) {
							score += 30; // Strong match
						} else {
							score += 10; // Still prefer branch-like names for branch-like elements
						}
					}
					
					// Strong match: main status bar with generic saved name
					if (isMainStatusBar && isSavedNameGeneric) {
						score += 40; // Very strong match
					}
					
					// Penalize mismatches
					if (isBranchLike && isSavedNameGeneric) {
						score -= 20; // Branch element shouldn't match generic name
					}
					if (isMainStatusBar && isSavedNameBranchLike) {
						score -= 20; // Main status bar shouldn't match branch name
					}
					
					// Check if saved name matches element text/aria-label
					if (elementText && savedName && elementText.toLowerCase().includes(savedName.toLowerCase())) {
						score += 10;
					}
					if (elementAriaLabel && savedName && elementAriaLabel.toLowerCase().includes(savedName.toLowerCase())) {
						score += 10;
					}
					if (elementTitle && savedName && elementTitle.toLowerCase().includes(savedName.toLowerCase())) {
						score += 5;
					}
					
					return { item, score };
				});
				
				// Sort by score (highest first), then by position in settings
				scoredMatches.sort((a, b) => {
					if (b.score !== a.score) {
						return b.score - a.score;
					}
					// If scores are equal, prefer items that appear earlier in settings (maintain order)
					const indexA = this.items.indexOf(a.item);
					const indexB = this.items.indexOf(b.item);
					return indexA - indexB;
				});
				
					matchingSavedItems = [scoredMatches[0].item];
				}
			} else if (matchingSavedItems.length === 1) {
				// Single match - verify it's the right position if possible
				const parts = matchingSavedItems[0].id.split(';');
				const itemIndex = parseInt(parts[parts.length - 1] || '0', 10);
				// If the index doesn't match DOM position, we might need to adjust
				// But only if there are other unmatched items with same canonical name
				const allUnmatchedSameCanonical = savedItems.filter(item => {
					if (matchedSavedIds.has(item.id)) return false;
					const itemCanonicalName = this.getCanonicalNameFromId(item.id);
					return itemCanonicalName === canonicalName;
				});
				if (allUnmatchedSameCanonical.length > 1 && itemIndex !== actualDomPosition) {
					// There are other items, try to find better match by position
					const betterMatch = allUnmatchedSameCanonical.find(item => {
						const itemParts = item.id.split(';');
						const itemIdx = parseInt(itemParts[itemParts.length - 1] || '0', 10);
						return itemIdx === actualDomPosition;
					});
					if (betterMatch) {
						matchingSavedItems = [betterMatch];
					}
				}
			}

			// If no match by canonical name, try matching by plugin identifier + position
			// This handles cases where the same plugin element might have slightly different class combinations
			if (matchingSavedItems.length === 0) {
				const pluginClass = allClasses.find(cls => 
					cls.includes('plugin-') || 
					cls.includes('obsidian-git') ||
					cls.includes('-git')
				);
				
				if (pluginClass) {
					// Find saved items from the same plugin that haven't been matched
					const samePluginItems = savedItems.filter(item => {
						if (matchedSavedIds.has(item.id)) return false;
						const itemCanonicalName = this.getCanonicalNameFromId(item.id);
						return itemCanonicalName.includes(pluginClass) || 
						       itemCanonicalName.includes('obsidian-git') ||
						       itemCanonicalName.includes('plugin-obsidian-git');
					});

					// Match by DOM position (order) - first unmatched item from same plugin
					if (samePluginItems.length > 0) {
						// Sort by their current position in settings to maintain order
						samePluginItems.sort((a, b) => {
							const indexA = this.items.indexOf(a);
							const indexB = this.items.indexOf(b);
							return indexA - indexB;
						});
						matchingSavedItems = [samePluginItems[0]];
					}
				}
			}

			if (matchingSavedItems.length > 0) {
				// Match to the best matching saved item
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

				// Only update saved item's name if:
				// 1. The saved item has a generic name (like canonical name or "Status bar item")
				// 2. OR the element name matches the saved name (confirming it's the right match)
				// This prevents name swapping when wrong items are matched
				const canonicalNameFromId = this.getCanonicalNameFromId(id);
				const hasGenericName = !savedItem.name || 
					savedItem.name === canonicalNameFromId || 
					savedItem.name === 'Status bar item' ||
					savedItem.name.startsWith('plugin-') ||
					savedItem.name.startsWith('status-bar-item');

				if (elementName && elementName.length > 0 && elementName.length < 100) {
					// For dynamic content like "Last Commit: X minutes ago", don't update the name
					if (!elementName.includes(':') || elementName.length < 30) {
						// Only update if:
						// - Saved item has generic name (safe to update)
						// - OR element name matches saved name (confirming correct match)
						if (hasGenericName || elementName === savedItem.name) {
							// For branch names (short, no colons), update the name
							// For main status bar (has colons or longer), keep saved name
							if (elementName.length < 30 && !elementName.includes(':')) {
								savedItem.name = elementName;
							} else if (hasGenericName && elementName.length >= 30) {
								// For longer names, use a portion or keep generic
								savedItem.name = elementName.substring(0, 50);
							}
						}
					}
				} else if (hasGenericName) {
					// Fall back to ID-based name if no meaningful content and saved name is generic
					const fallbackName = canonicalNameFromId || 'Status bar item';
					if (!savedItem.name || savedItem.name === fallbackName) {
						savedItem.name = fallbackName;
					}
				}
				
				// Parse the ID to update element count tracking
				const parts = id.split(';');
				const indexStr = parts.pop();
				if (indexStr) {
					index = parseInt(indexStr, 10);
					// Update element count tracking using canonical name
					pluginElementCount[canonicalName] = Math.max(
						index,
						canonicalName in pluginElementCount ? pluginElementCount[canonicalName] : 0
					);
				}
			} else {
				// No match found - this is a truly new element OR element has existing ID but no saved match
				if (!id) {
					// Generate new ID using canonical name
					index = (canonicalName in pluginElementCount) ? pluginElementCount[canonicalName] + 1 : 1;
					id = `${canonicalName};${index}`;
					pluginElementCount[canonicalName] = index;
				} else {
					// Element has existing ID but no saved match
					// Normalize the ID to use canonical name (removes dynamic classes from ID)
					// This ensures consistency and prevents duplicates
					const existingCanonicalName = this.getCanonicalNameFromId(id);
					if (existingCanonicalName !== canonicalName) {
						// ID has different canonical name - update to use current canonical name
						// Preserve the index if it makes sense, otherwise generate new one
						const existingIndex = parseInt(id.split(';').pop() || '1', 10);
						index = (canonicalName in pluginElementCount) ? 
							Math.max(pluginElementCount[canonicalName] + 1, existingIndex) : 
							existingIndex;
						id = `${canonicalName};${index}`;
						pluginElementCount[canonicalName] = index;
					} else {
						// ID already uses canonical name - preserve it
						// The index and name were already set above when we parsed the existing ID
					}
				}
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
