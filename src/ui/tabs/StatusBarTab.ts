/**
 * Status Bar Tab - Unified list of existing + custom status bar items
 * EXACTLY matches Status Bar Organizer's design 1:1
 */

import { setIcon } from 'obsidian';
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
	render(container: HTMLElement): void {
		container.empty();
		const settings = this.getSettings();
		
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
			previewSpan.appendChild(cloned);
		}

		// Device mode icon (for custom items only)
		if (item.type === 'custom') {
			const deviceModeSpan = entry.createSpan('ui-tweaker-status-bar-row-device-mode');
			deviceModeSpan.addEventListener('click', (e) => {
				e.stopPropagation();
				this.toggleDeviceMode(item);
			});
			setIcon(deviceModeSpan, this.getDeviceModeIcon(item.mode || 'any'));
			if (item.mode && item.mode !== 'any') {
				deviceModeSpan.addClass('ui-tweaker-active');
			}
		}
		
		// Color picker icon (for custom items only)
		if (item.type === 'custom') {
			const colorSpan = entry.createSpan('ui-tweaker-status-bar-row-color');
			colorSpan.addEventListener('click', (e) => {
				e.stopPropagation();
				this.showColorPicker(item);
			});
			setIcon(colorSpan, item.color ? 'palette' : 'palette');
			if (item.color) {
				colorSpan.addClass('ui-tweaker-active');
				setCssProps(colorSpan, { color: item.color });
			}
		}
		
		// MD-only icon (for custom items only)
		if (item.type === 'custom') {
			const mdOnlySpan = entry.createSpan('ui-tweaker-status-bar-row-md-only');
			mdOnlySpan.addEventListener('click', (e) => {
				e.stopPropagation();
				item.mdOnly = !item.mdOnly;
				setIcon(mdOnlySpan, item.mdOnly ? 'file-check' : 'file-x');
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
		}

		// Lock icon (new feature)
		const lockSpan = entry.createSpan('ui-tweaker-status-bar-row-lock');
		lockSpan.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleLock(item, lockSpan, index, totalItems, rowsContainer, settings);
		});
		setIcon(lockSpan, item.sticky ? 'lock' : 'unlock');
		if (item.sticky) {
			lockSpan.addClass('ui-tweaker-locked');
		}

		// Visibility icon
		const visibilitySpan = entry.createSpan('ui-tweaker-status-bar-row-visibility');
		visibilitySpan.addEventListener('click', () => {
			if (exists) {
				this.toggleVisibility(item, visibilitySpan, entry);
				// toggleVisibility already calls saveSettings()
			} else {
				void this.removeItem(rowsContainer, item, settings);
			}
		});
		setIcon(visibilitySpan, exists ? (item.hidden ? 'eye-off' : 'eye') : 'trash-2');
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

		// Device mode icon
		const deviceModeSpan = entry.createSpan('ui-tweaker-status-bar-row-device-mode');
		deviceModeSpan.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleDeviceMode(item);
		});
		setIcon(deviceModeSpan, this.getDeviceModeIcon(item.mode || 'any'));
		if (item.mode && item.mode !== 'any') {
			deviceModeSpan.addClass('ui-tweaker-active');
		}
		
		// Color picker icon
		const colorSpan = entry.createSpan('ui-tweaker-status-bar-row-color');
		colorSpan.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showColorPicker(item);
		});
		setIcon(colorSpan, 'palette');
		if (item.color) {
			colorSpan.addClass('ui-tweaker-active');
			setCssProps(colorSpan, { color: item.color });
		}
		
		// MD-only icon
		const mdOnlySpan = entry.createSpan('ui-tweaker-status-bar-row-md-only');
		mdOnlySpan.addEventListener('click', (e) => {
			e.stopPropagation();
			item.mdOnly = !item.mdOnly;
			setIcon(mdOnlySpan, item.mdOnly ? 'file-check' : 'file-x');
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
		lockSpan.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleLock(item, lockSpan, index, totalItems, rowsContainer, settings);
		});
		setIcon(lockSpan, item.sticky ? 'lock' : 'unlock');
		if (item.sticky) {
			lockSpan.addClass('ui-tweaker-locked');
		}

		// Visibility icon
		const visibilitySpan = entry.createSpan('ui-tweaker-status-bar-row-visibility');
		visibilitySpan.addEventListener('click', () => {
			this.toggleVisibility(item, visibilitySpan, entry);
			// toggleVisibility already calls saveSettings()
		});
		setIcon(visibilitySpan, item.hidden ? 'eye-off' : 'eye');
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
		} else {
			entry.removeClass('ui-tweaker-status-bar-row-hidden');
			setIcon(visibilitySpan, 'eye');
		}
		
		this.plugin.statusBarManager?.reorder();
		void this.saveSettings(); // Save the hidden state
	}

	/**
	 * Toggle device mode (cycles through: any -> desktop -> mobile -> this device -> any)
	 */
	private toggleDeviceMode(item: StatusBarItem): void {
		const appId = (this.app as { appId?: string }).appId || 'this-device';
		const currentMode = item.mode || 'any';
		
		// Cycle through modes
		if (currentMode === 'any') {
			item.mode = 'desktop';
		} else if (currentMode === 'desktop') {
			item.mode = 'mobile';
		} else if (currentMode === 'mobile') {
			item.mode = appId;
		} else {
			item.mode = 'any';
		}
		
		// Update icon
		const deviceModeSpan = document.querySelector(`[data-ui-tweaker-id="${item.id}"] .ui-tweaker-status-bar-row-device-mode`) as HTMLElement;
		if (deviceModeSpan) {
			setIcon(deviceModeSpan, this.getDeviceModeIcon(item.mode));
			if (item.mode && item.mode !== 'any') {
				deviceModeSpan.addClass('ui-tweaker-active');
			} else {
				deviceModeSpan.removeClass('ui-tweaker-active');
			}
		}
		
		this.plugin.statusBarManager?.reorder();
		void this.saveSettings();
	}
	
	/**
	 * Get device mode icon
	 */
	private getDeviceModeIcon(mode: string): string {
		if (mode === 'desktop') return 'monitor';
		if (mode === 'mobile') return 'smartphone';
		if (mode === 'any' || !mode) return 'monitor-smartphone';
		return 'monitor-check'; // "this device"
	}
	
	/**
	 * Show color picker for item
	 */
	private showColorPicker(statusBarItem: StatusBarItem): void {
		// Create a simple color input
		const input = document.createElement('input');
		input.type = 'color';
		input.value = statusBarItem.color || '#000000';
		setCssProps(input, {
			position: 'fixed',
			opacity: '0',
			pointerEvents: 'none'
		});
		document.body.appendChild(input);
		
		input.addEventListener('change', () => {
			const value = input.value;
			if (value === '#000000') {
				statusBarItem.color = undefined;
			} else {
				statusBarItem.color = value;
			}
			
			// Update color icon
			const colorSpan = document.querySelector(`[data-ui-tweaker-id="${statusBarItem.id}"] .ui-tweaker-status-bar-row-color`) as HTMLElement;
			if (colorSpan) {
				if (statusBarItem.color) {
					colorSpan.addClass('ui-tweaker-active');
					setCssProps(colorSpan, { color: statusBarItem.color });
				} else {
					colorSpan.removeClass('ui-tweaker-active');
					colorSpan.style.removeProperty('color');
				}
			}
			
			this.plugin.statusBarManager?.reorder();
			void this.saveSettings();
			document.body.removeChild(input);
		});
		
		input.click();
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

		// Copy children (but skip the handle to avoid duplication)
		for (const child of Array.from(stationaryRow.children)) {
			if (child.classList.contains('ui-tweaker-status-bar-row-handle')) {
				// Skip the handle - we don't want it duplicated
				continue;
			}
			const fauxSpan = document.createElement('span');
			fauxSpan.className = child.className;
			// Clone instead of using innerHTML
			const cloned = (child as HTMLElement).cloneNode(true) as HTMLElement;
			fauxSpan.appendChild(cloned);
			movableRow.appendChild(fauxSpan);
		}

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
