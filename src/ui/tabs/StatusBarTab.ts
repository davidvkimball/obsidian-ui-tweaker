/**
 * Status Bar Tab - Unified list of existing + custom status bar items
 * EXACTLY matches Status Bar Organizer's design 1:1
 */

import { setIcon, ColorComponent } from 'obsidian';
import { TabRenderer } from '../common/TabRenderer';
import { StatusBarItem } from '../../types';
import { UISettings } from '../../settings';
import { chooseNewCommand } from '../../utils/chooseCommand';
import { setCssProps } from '../../uiManager';
import { createSettingsGroup } from '../../utils/settings-compat';

// Simple array move utility
function arrayMoveMutable<T>(array: T[], from: number, to: number): void {
	const item = array[from];
	array.splice(from, 1);
	array.splice(to, 0, item);
}

let dragging = false;

export class StatusBarTab extends TabRenderer {
	private container?: HTMLElement;
	render(container: HTMLElement): void {
		container.empty();
		const settings = this.getSettings();
		// Store container reference for re-renders
		this.container = container;
		
		// Ensure statusBarItems exists
		if (!settings.statusBarItems) {
			settings.statusBarItems = [];
		}

		// Create wrapper
		const wrapper = container.createDiv('ui-tweaker-status-bar-rows-wrapper');
		
		// Create rows container
		const rowsContainer = wrapper.createDiv('ui-tweaker-status-bar-rows-container');

		// Render all items as simple rows (exactly like Status Bar Organizer)
		settings.statusBarItems.forEach((item, index) => {
			if (item.type === 'existing') {
				this.renderExistingRow(rowsContainer, item, settings, index, settings.statusBarItems.length);
			} else {
				this.renderCustomRow(rowsContainer, item, settings, index, settings.statusBarItems.length);
			}
		});

		// Add command button (at the end)
		if (settings.statusBarItems.length > 0) {
			container.createEl('hr');
		}
		
		const addGroup = createSettingsGroup(container, undefined, 'ui-tweaker');
		addGroup.addSetting((setting): void => {
			setting
				.setName('Add command')
				.setDesc('Add a new command button to the status bar')
				.addButton((button) => {
					// Add icon to the button
					const buttonEl = button.buttonEl;
					const iconContainer = buttonEl.createSpan({ cls: 'ui-tweaker-add-icon' });
					setIcon(iconContainer, 'lucide-image-plus');
					buttonEl.insertBefore(iconContainer, buttonEl.firstChild);
					button.setButtonText('Add command').setCta().onClick(() => {
						void (async () => {
							try {
								const pair = await chooseNewCommand(this.plugin);
								await this.plugin.statusBarManager?.addCustomCommand(pair);
								// Save scroll position before re-render
								const scrollContainer = container.closest('.vertical-tab-content') || 
									container.closest('.settings-content') || 
									container.parentElement;
								const scrollTop = scrollContainer?.scrollTop || 0;
								
								// Re-render and restore scroll
								this.render(container);
								requestAnimationFrame(() => {
									if (scrollContainer) {
										scrollContainer.scrollTop = scrollTop;
									}
								});
							} catch {
								// User cancelled
							}
						})();
					});
				});
		});
	}

	/**
	 * Render an existing status bar item row (EXACTLY like Status Bar Organizer)
	 */
	private renderExistingRow(rowsContainer: HTMLElement, item: StatusBarItem, settings: UISettings, index: number, totalItems: number): void {
		// Get the actual status bar element for preview
		const statusBarContainer = (this.plugin.app as { statusBar?: { containerEl?: HTMLElement } }).statusBar?.containerEl;
		const actualElement = statusBarContainer?.querySelector(`[data-ui-tweaker-status-bar-id="${item.id}"]`) as HTMLElement;
		const exists = !!actualElement;

		// Create row
		const entry = rowsContainer.createDiv('ui-tweaker-status-bar-row');
		entry.addClass('ui-tweaker-row');
		if (!exists) entry.addClass('ui-tweaker-status-bar-row-disabled');
		if (item.hidden) entry.addClass('ui-tweaker-status-bar-row-hidden');
		entry.setAttribute('data-ui-tweaker-id', item.id);

		// Drag handle
		const handle = entry.createSpan('ui-tweaker-status-bar-row-handle');
		handle.addEventListener('mousedown', (event) => 
			this.handleMouseDown(event, rowsContainer, item, settings)
		);

		// Title
		const titleSpan = entry.createSpan('ui-tweaker-status-bar-row-title');
		titleSpan.textContent = item.name;

		// Preview
		const previewSpan = entry.createSpan('ui-tweaker-status-bar-row-preview');
		if (exists && actualElement) {
			// Clone the element instead of using innerHTML
			const cloned = actualElement.cloneNode(true) as HTMLElement;
			// Ensure cloned element and all children are visible
			setCssProps(cloned, { display: '', visibility: '', opacity: '' });
			// Make sure all child elements are visible
			cloned.querySelectorAll('*').forEach((child) => {
				setCssProps(child as HTMLElement, { display: '', visibility: '', opacity: '' });
			});
			previewSpan.appendChild(cloned);
		}

		// Empty spans for custom item options (existing items don't have these)
		entry.createSpan('ui-tweaker-status-bar-row-reset-color'); // Empty
		entry.createSpan('ui-tweaker-status-bar-row-color-picker'); // Empty
		// Device mode icon removed - status bar not visible on mobile, so no need for device indicators
		entry.createSpan('ui-tweaker-status-bar-row-md-only'); // Empty

		// Lock icon (new feature)
		const lockSpan = entry.createSpan('ui-tweaker-status-bar-row-lock');
		lockSpan.setAttribute('aria-label', item.sticky ? `Locked to ${item.sticky}` : 'Unlocked - click to lock position');
		lockSpan.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleLock(item, lockSpan, index, totalItems, rowsContainer, settings);
		});
		setIcon(lockSpan, item.sticky ? 'lock' : 'unlock');
		if (item.sticky) {
			lockSpan.addClass('ui-tweaker-locked');
		}

		// Delete icon for custom items, visibility icon for existing items
		const visibilitySpan = entry.createSpan('ui-tweaker-status-bar-row-visibility');
		if (item.type === 'custom') {
			// Custom items: show trash icon (red/warning)
			visibilitySpan.setAttribute('aria-label', 'Delete item');
			visibilitySpan.addClass('mod-warning');
			setCssProps(visibilitySpan, { color: 'var(--text-error)' });
			visibilitySpan.addEventListener('click', () => {
				void this.removeItem(rowsContainer, item, settings);
			});
			setIcon(visibilitySpan, 'trash-2');
		} else {
			// Existing items: show visibility toggle
			visibilitySpan.setAttribute('aria-label', item.hidden ? 'Hidden - click to show' : 'Visible - click to hide');
			visibilitySpan.addEventListener('click', () => {
				this.toggleVisibility(item, visibilitySpan, entry);
				// toggleVisibility already calls saveSettings()
			});
			setIcon(visibilitySpan, item.hidden ? 'eye-off' : 'eye');
		}
	}

	/**
	 * Render a custom status bar item row (EXACTLY like Status Bar Organizer, but with editable name)
	 */
	private renderCustomRow(rowsContainer: HTMLElement, item: StatusBarItem, settings: UISettings, index: number, totalItems: number): void {
		// Create row
		const entry = rowsContainer.createDiv('ui-tweaker-status-bar-row');
		entry.addClass('ui-tweaker-row');
		if (item.hidden) entry.addClass('ui-tweaker-status-bar-row-hidden');
		entry.setAttribute('data-ui-tweaker-id', item.id);

		// Drag handle
		const handle = entry.createSpan('ui-tweaker-status-bar-row-handle');
		handle.addEventListener('mousedown', (event) => 
			this.handleMouseDown(event, rowsContainer, item, settings)
		);

		// Title with editable name
		const titleSpan = entry.createSpan('ui-tweaker-status-bar-row-title');
		const displayName = item.displayName || item.name;
		const nameText = item.name === displayName ? item.name : `${item.name} (${displayName})`;
		titleSpan.textContent = nameText;
		
		// Make title editable on click
		titleSpan.addEventListener('dblclick', () => {
			const currentName = item.name;
			const input = document.createElement('input');
			input.type = 'text';
			input.value = currentName;
			input.addClass('mod-text-input');
			setCssProps(input, { width: '100%' });
			titleSpan.empty();
			titleSpan.appendChild(input);
			input.focus();
			input.select();
			
			const saveName = () => {
				let newName = input.value.trim();
				if (!newName) newName = currentName;
				item.name = newName;
				this.plugin.statusBarManager?.updateButtonNames();
				titleSpan.textContent = newName === displayName ? newName : `${newName} (${displayName})`;
				void this.saveSettings();
			};
			
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					saveName();
				} else if (e.key === 'Escape') {
					e.preventDefault();
					titleSpan.textContent = nameText;
				}
			});
			input.addEventListener('blur', saveName);
		});

		// Preview
		const previewSpan = entry.createSpan('ui-tweaker-status-bar-row-preview');
		if (item.icon) {
			const previewIcon = previewSpan.createSpan('status-bar-item clickable-icon');
			setIcon(previewIcon, item.icon);
			if (item.color && item.color !== '#000000') {
				setCssProps(previewIcon, { color: item.color });
			}
		}

		// Reset color button (only show if color is set)
		const resetColorContainer = entry.createSpan('ui-tweaker-status-bar-row-reset-color');
		if (item.color) {
			const resetButton = resetColorContainer.createEl('button', {
				cls: 'clickable-icon ui-tweaker-color-reset',
				attr: { 'aria-label': 'Reset to default color' }
			});
			setIcon(resetButton, 'rotate-cw');
			resetButton.addEventListener('click', (e) => {
				e.stopPropagation();
				item.color = undefined;
				// Update preview icon
				const previewIcon = previewSpan.querySelector('.clickable-icon') as HTMLElement;
				if (previewIcon) {
					previewIcon.style.removeProperty('color');
				}
				this.plugin.statusBarManager?.reorder();
				void this.saveSettings();
				// Re-render to update UI
				if (this.container) {
					this.render(this.container);
				}
			});
		}
		
		// Color picker (Obsidian's native component)
		const colorPickerContainer = entry.createSpan('ui-tweaker-status-bar-row-color-picker');
		const colorPickerEl = colorPickerContainer.createDiv();
		const colorPicker = new ColorComponent(colorPickerEl);
		colorPicker.setValue(item.color || '#000000');
		colorPicker.onChange((value) => {
			if (value === '#000000') {
				item.color = undefined;
			} else {
				item.color = value;
			}
			// Update preview icon color in real-time
			const previewIcon = previewSpan.querySelector('.clickable-icon') as HTMLElement;
			if (previewIcon) {
				if (item.color && item.color !== '#000000') {
					setCssProps(previewIcon, { color: item.color });
				} else {
					previewIcon.style.removeProperty('color');
				}
			}
			this.plugin.statusBarManager?.reorder();
			void this.saveSettings();
			// Re-render to show/hide reset button
			if (this.container) {
				this.render(this.container);
			}
		});
		
		// Device mode icon - removed (status bar not visible on mobile, so no need for device indicators)
		
		// MD-only icon
		const mdOnlySpan = entry.createSpan('ui-tweaker-status-bar-row-md-only');
		mdOnlySpan.setAttribute('aria-label', item.mdOnly ? 'Only show on Markdown files (enabled)' : 'Only show on Markdown files (disabled)');
		mdOnlySpan.addEventListener('click', (e) => {
			e.stopPropagation();
			item.mdOnly = !item.mdOnly;
			setIcon(mdOnlySpan, item.mdOnly ? 'file-check' : 'file-x');
			mdOnlySpan.setAttribute('aria-label', item.mdOnly ? 'Only show on Markdown files (enabled)' : 'Only show on Markdown files (disabled)');
			if (item.mdOnly) {
				mdOnlySpan.addClass('ui-tweaker-active');
			} else {
				mdOnlySpan.removeClass('ui-tweaker-active');
			}
			this.plugin.statusBarManager?.reorder();
			void this.saveSettings();
		});
		setIcon(mdOnlySpan, item.mdOnly ? 'file-check' : 'file-x');
		if (item.mdOnly) {
			mdOnlySpan.addClass('ui-tweaker-active');
		}

		// Lock icon (new feature)
		const lockSpan = entry.createSpan('ui-tweaker-status-bar-row-lock');
		lockSpan.setAttribute('aria-label', item.sticky ? `Locked to ${item.sticky}` : 'Unlocked - click to lock position');
		lockSpan.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleLock(item, lockSpan, index, totalItems, rowsContainer, settings);
		});
		setIcon(lockSpan, item.sticky ? 'lock' : 'unlock');
		if (item.sticky) {
			lockSpan.addClass('ui-tweaker-locked');
		}

		// Delete icon for custom items, visibility icon for existing items
		const visibilitySpan = entry.createSpan('ui-tweaker-status-bar-row-visibility');
		if (item.type === 'custom') {
			// Custom items: show trash icon (red/warning)
			visibilitySpan.setAttribute('aria-label', 'Delete item');
			visibilitySpan.addClass('mod-warning');
			setCssProps(visibilitySpan, { color: 'var(--text-error)' });
			visibilitySpan.addEventListener('click', () => {
				void this.removeItem(rowsContainer, item, settings);
			});
			setIcon(visibilitySpan, 'trash-2');
		} else {
			// Existing items: show visibility toggle
			visibilitySpan.setAttribute('aria-label', item.hidden ? 'Hidden - click to show' : 'Visible - click to hide');
			visibilitySpan.addEventListener('click', () => {
				this.toggleVisibility(item, visibilitySpan, entry);
				// toggleVisibility already calls saveSettings()
			});
			setIcon(visibilitySpan, item.hidden ? 'eye-off' : 'eye');
		}
	}

	/**
	 * Toggle lock position based on current position
	 */
	private toggleLock(
		item: StatusBarItem, 
		lockSpan: HTMLElement, 
		currentIndex: number, 
		totalItems: number,
		rowsContainer: HTMLElement,
		settings: UISettings
	): void {
		// If already locked, unlock it
		if (item.sticky) {
			item.sticky = false;
			setIcon(lockSpan, 'unlock');
			lockSpan.removeClass('ui-tweaker-locked');
			lockSpan.setAttribute('aria-label', 'Unlocked - click to lock position');
		} else {
			// Determine lock position based on current index
			// Position 0 or 1 -> lock left
			// Last position or second-to-last -> lock right
			if (currentIndex === 0 || currentIndex === 1) {
				item.sticky = 'left';
			} else if (currentIndex === totalItems - 1 || currentIndex === totalItems - 2) {
				item.sticky = 'right';
			} else {
				// For items in the middle, lock to the nearest end
				const distanceToStart = currentIndex;
				const distanceToEnd = totalItems - 1 - currentIndex;
				item.sticky = distanceToStart <= distanceToEnd ? 'left' : 'right';
			}
			setIcon(lockSpan, 'lock');
			lockSpan.addClass('ui-tweaker-locked');
			lockSpan.setAttribute('aria-label', `Locked to ${item.sticky}`);
		}
		
		// Update status bar order
		this.plugin.statusBarManager?.reorder();
		void this.saveSettings();
	}

	/**
	 * Toggle visibility (exactly like Status Bar Organizer)
	 */
	private toggleVisibility(item: StatusBarItem, visibilitySpan: HTMLElement, entry: HTMLElement): void {
		item.hidden = !item.hidden;
		
		if (item.hidden) {
			entry.addClass('ui-tweaker-status-bar-row-hidden');
			setIcon(visibilitySpan, 'eye-off');
			visibilitySpan.setAttribute('aria-label', 'Hidden - click to show');
		} else {
			entry.removeClass('ui-tweaker-status-bar-row-hidden');
			setIcon(visibilitySpan, 'eye');
			visibilitySpan.setAttribute('aria-label', 'Visible - click to hide');
		}
		
		this.plugin.statusBarManager?.reorder();
		void this.saveSettings(); // Save the hidden state
	}


	/**
	 * Remove item (exactly like Status Bar Organizer)
	 */
	private async removeItem(rowsContainer: HTMLElement, item: StatusBarItem, settings: UISettings): Promise<void> {
		const entry = rowsContainer.querySelector(`[data-ui-tweaker-id="${item.id}"]`) as HTMLElement;
		if (entry) {
			rowsContainer.removeChild(entry);
		}
		
		await this.plugin.statusBarManager?.removeItem(item);
		
		// Position is implicit in array order (like Status Bar Organizer)
		
		void this.saveSettings();
	}

	/**
	 * Handle mouse down for dragging (exactly like Status Bar Organizer)
	 */
	private handleMouseDown(
		event: MouseEvent,
		rowsContainer: HTMLElement,
		item: StatusBarItem,
		settings: UISettings
	): void {
		if (dragging) return;
		dragging = true;

		const entry = rowsContainer.querySelector(`[data-ui-tweaker-id="${item.id}"]`) as HTMLElement;
		if (!entry) return;

		// Create clone
		const stationaryRow = entry;
		stationaryRow.addClass('ui-tweaker-status-bar-row-clone');

		const movableRow = document.createElement('div');
		movableRow.addClass('ui-tweaker-status-bar-row');
		movableRow.addClass('ui-tweaker-status-bar-row-drag');
		// Ensure grid structure is maintained
		setCssProps(movableRow, {
			display: 'grid',
			gridTemplateColumns: '1.25em 0.5fr 0.8fr 2em 2em 2em 2em 2em 2em'
		});
		if (item.hidden) movableRow.addClass('ui-tweaker-status-bar-row-hidden');
		if (item.type === 'existing') {
			const statusBarContainer = (this.plugin.app as { statusBar?: { containerEl?: HTMLElement } }).statusBar?.containerEl;
			const actualElement = statusBarContainer?.querySelector(`[data-ui-tweaker-id="${item.id}"]`) as HTMLElement;
			if (!actualElement) movableRow.addClass('ui-tweaker-status-bar-row-disabled');
		}

		// Get the wrapper container
		const wrapper = rowsContainer.closest('.ui-tweaker-status-bar-rows-wrapper') || 
			rowsContainer.parentElement || 
			rowsContainer;
		wrapper.appendChild(movableRow);

		// Get position relative to wrapper (exactly like Status Bar Organizer)
		const containerX = wrapper.getBoundingClientRect().left;
		const containerY = wrapper.getBoundingClientRect().top;

		// Position movable row (exactly like Status Bar Organizer)
		const stationaryRect = stationaryRow.getBoundingClientRect();
		setCssProps(movableRow, { 
			position: 'absolute',
			left: (stationaryRect.left - containerX) + 'px',
			top: (stationaryRect.top - containerY) + 'px',
			width: stationaryRow.offsetWidth + 'px'
		});

		// Create simplified drag preview (don't clone complex elements to avoid breaking)
		// Just show title and preview, skip interactive elements
		movableRow.createSpan('ui-tweaker-status-bar-row-handle');
		const dragTitle = movableRow.createSpan('ui-tweaker-status-bar-row-title');
		dragTitle.textContent = item.name;
		const dragPreview = movableRow.createSpan('ui-tweaker-status-bar-row-preview');
		// For existing items, try to clone preview if available
		if (item.type === 'existing') {
			const statusBarContainer = (this.plugin.app as { statusBar?: { containerEl?: HTMLElement } }).statusBar?.containerEl;
			const actualElement = statusBarContainer?.querySelector(`[data-ui-tweaker-status-bar-id="${item.id}"]`) as HTMLElement;
			if (actualElement) {
				const cloned = actualElement.cloneNode(true) as HTMLElement;
				// Remove tooltip attributes from cloned element
				cloned.removeAttribute('aria-label');
				cloned.removeAttribute('title');
				// Also remove from any children
				cloned.querySelectorAll('[aria-label], [title]').forEach(el => {
					el.removeAttribute('aria-label');
					el.removeAttribute('title');
				});
				dragPreview.appendChild(cloned);
			}
		} else if (item.icon) {
			const previewIcon = dragPreview.createSpan('status-bar-item clickable-icon');
			setIcon(previewIcon, item.icon);
			// Remove any tooltip attributes from drag preview
			previewIcon.removeAttribute('aria-label');
			previewIcon.removeAttribute('title');
			if (item.color && item.color !== '#000000') {
				setCssProps(previewIcon, { color: item.color });
			}
		}
		// Add empty spans for the icon columns to maintain grid structure
		movableRow.createSpan('ui-tweaker-status-bar-row-reset-color');
		movableRow.createSpan('ui-tweaker-status-bar-row-color-picker');
		// Device mode icon removed - status bar not visible on mobile, so no need for device indicators
		movableRow.createSpan('ui-tweaker-status-bar-row-md-only');
		const dragLock = movableRow.createSpan('ui-tweaker-status-bar-row-lock');
		setIcon(dragLock, item.sticky ? 'lock' : 'unlock');
		const dragVisibility = movableRow.createSpan('ui-tweaker-status-bar-row-visibility');
		setIcon(dragVisibility, item.hidden ? 'eye-off' : 'eye');

		// Calculate offsets (exactly like Status Bar Organizer)
		// First get the position relative to the movableRow
		let offsetX = event.clientX - movableRow.getBoundingClientRect().left;
		let offsetY = event.clientY - movableRow.getBoundingClientRect().top;
		// Then add container offset (exactly like Status Bar Organizer)
		offsetX = offsetX + containerX;
		offsetY = offsetY + containerY;
		let index = Array.from(rowsContainer.children).indexOf(stationaryRow);

		// Handle mouse move (exactly like Status Bar Organizer)
		const handleMouseMove = (e: MouseEvent) => {
			// Update position (exactly like Status Bar Organizer)
			// offsetX/offsetY already include containerX/containerY
			setCssProps(movableRow, {
				left: (e.clientX - offsetX) + 'px',
				top: (e.clientY - offsetY) + 'px'
			});

			// Calculate distance (like Status Bar Organizer)
			const dist = movableRow.getBoundingClientRect().top - stationaryRow.getBoundingClientRect().top;
			
			// If moved far enough, change position (like Status Bar Organizer)
			if (Math.abs(dist) > stationaryRow.offsetHeight * 0.75) {
				const dir = dist / Math.abs(dist);
				const newIndex = Math.max(0, Math.min(index + dir, rowsContainer.children.length - 1));
				if (newIndex !== index) {
					// Move in DOM (like Status Bar Organizer)
					rowsContainer.removeChild(stationaryRow);
					if (newIndex < rowsContainer.children.length) {
						rowsContainer.insertBefore(stationaryRow, rowsContainer.children[newIndex]);
					} else {
						rowsContainer.appendChild(stationaryRow);
					}
					
					// Update array order (don't save during drag - wait for mouse up)
					if (settings.statusBarItems) {
						const oldIndex = settings.statusBarItems.findIndex((i: StatusBarItem) => i.id === item.id);
						if (oldIndex !== -1 && oldIndex !== newIndex) {
							arrayMoveMutable(settings.statusBarItems, oldIndex, newIndex);
							// Update the actual status bar order immediately (visual feedback)
							this.plugin.statusBarManager?.reorder();
							// Don't saveSettings during drag - wait for mouse up to save position
						}
					}
					
					index = newIndex;
				}
			}
		};

		// Handle mouse up
		const handleMouseUp = () => {
			// Clean up drag visuals
			stationaryRow.removeClass('ui-tweaker-status-bar-row-clone');
			if (movableRow.parentElement === wrapper) {
				wrapper.removeChild(movableRow);
			}
			dragging = false;
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
			
			// Update status bar order and save position after drag completes
			this.plugin.statusBarManager?.reorder();
			void this.saveSettings();
		};

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}
}
