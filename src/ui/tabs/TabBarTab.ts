/**
 * Tab Bar Tab - Custom command buttons for page headers
 */

import { setIcon } from 'obsidian';
import { TabRenderer } from '../common/TabRenderer';
import { createSettingsGroup } from '../../utils/settings-compat';
import { CommandIconPair } from '../../types';
import { chooseNewCommand } from '../../utils/chooseCommand';
import { IconPickerModal } from '../../modals/IconPickerModal';
import { setCssProps } from '../../uiManager';

// Simple array move utility
function arrayMoveMutable<T>(array: T[], from: number, to: number): void {
	const item = array[from];
	array.splice(from, 1);
	array.splice(to, 0, item);
}

export class TabBarTab extends TabRenderer {
	render(container: HTMLElement): void {
		container.empty();
		const settings = this.getSettings();
		
		// Ensure tabBarCommands exists
		if (!settings.tabBarCommands) {
			settings.tabBarCommands = [];
		}

		// List of commands using Setting components (like HiderTab)
		settings.tabBarCommands.forEach((pair, index) => {
			this.renderCommandItem(container, pair, index);
		});

		// Add command button (at the end)
		if (settings.tabBarCommands.length > 0) {
			// Add separator
			container.createEl('hr');
		}
		
		const addGroup = createSettingsGroup(container, undefined, 'ui-tweaker');
		addGroup.addSetting((setting): void => {
			setting
				.setName('Add command')
				.setDesc('Add a new command button to the tab bar')
				.addButton((button) => {
					button.setButtonText('Add command').setCta().onClick(() => {
						void (async () => {
							try {
								const pair = await chooseNewCommand(this.plugin);
								// addCommand will push to settings.tabBarCommands and save
								await this.plugin.tabBarManager?.addCommand(pair);
								this.render(container);
							} catch {
								// User cancelled
							}
						})();
					});
				});
		});
	}

	private renderCommandItem(container: HTMLElement, pair: CommandIconPair, index: number): void {
		const settings = this.getSettings();
		const group = createSettingsGroup(container, undefined, 'ui-tweaker');
		
		// Store reference to other settings for collapsible functionality
		const otherSettings: HTMLElement[] = [];
		
		// Command name with editable name (like Vault CMS) and icon preview with color
		const displayName = pair.displayName || pair.name;
		group.addSetting((setting): void => {
			// Prevent default click behavior on the setting item itself
			setting.settingEl.addEventListener('click', (e) => {
				// Only allow collapse if clicking directly on the chevron
				const target = e.target as HTMLElement;
				if (!target.closest('.ui-tweaker-collapse-icon')) {
					e.stopPropagation();
				}
			});
			
			// Make nameEl a flex container so chevron can be positioned to the left
			const nameEl = setting.nameEl;
			setCssProps(nameEl, { display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' });
			
			// Add chevrons-up-down icon to the LEFT of the name (before name container)
			const chevronContainer = document.createElement('div');
			chevronContainer.className = 'ui-tweaker-collapse-icon';
			setCssProps(chevronContainer, { 
				cursor: 'default',
				background: 'transparent',
				padding: '0',
				margin: '0',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center'
			});
			// Insert as first child to ensure it's on the left
			nameEl.insertBefore(chevronContainer, nameEl.firstChild);
			let isExpanded = false;
			setIcon(chevronContainer, 'chevrons-up-down');
			
			// Toggle on chevron click - will be set up after all settings are added
			chevronContainer.addEventListener('click', (e) => {
				e.stopPropagation();
				isExpanded = !isExpanded;
				// Swap icon: chevrons-up-down (collapsed) <-> chevrons-down-up (expanded)
				setIcon(chevronContainer, isExpanded ? 'chevrons-down-up' : 'chevrons-up-down');
				otherSettings.forEach(settingEl => {
					setCssProps(settingEl, { display: isExpanded ? '' : 'none' });
				});
			});
			
			// Create editable name container with pencil icon
			const nameContainer = nameEl.createDiv({ cls: 'ui-tweaker-editable-name' });
			setCssProps(nameContainer, { display: 'flex', alignItems: 'center', gap: '0.5rem' });
			
			// Function to create the display element with click handler
			const createNameDisplay = (name: string) => {
				nameContainer.empty();
				
				const display = nameContainer.createSpan({ 
					text: name === displayName ? name : `${name} (${displayName})`,
					cls: 'ui-tweaker-name-display'
				});
				
				// Add pencil icon
				const iconContainer = nameContainer.createDiv({ cls: 'ui-tweaker-edit-icon' });
				setCssProps(iconContainer, { opacity: '0.6' });
				setIcon(iconContainer, 'lucide-pencil-line');
				
				// Make name and icon editable on click
				const startEdit = () => {
					const currentName = pair.name;
					
					// Clear container
					nameContainer.empty();
					
					// Create input using native Obsidian styling
					const nameInput = nameContainer.createEl('input', {
						type: 'text',
						value: currentName
					});
					nameInput.addClass('mod-text-input');
					
					// Focus and select text
					nameInput.focus();
					nameInput.select();
					
					// Save on blur
					const saveName = () => {
						nameInput.removeEventListener('blur', saveName);
						
						let newName = nameInput.value.trim();
						if (!newName) {
							newName = currentName; // Revert to original if empty
						}
						pair.name = newName;
						
						// Update existing buttons immediately (don't wait for re-render)
						this.plugin.tabBarManager?.updateButtonNames();
						
						// Re-render to update display and save
						void (async () => {
							await this.saveSettings();
							this.render(container);
						})();
					};
					
					// Save on Enter
					nameInput.addEventListener('keydown', (e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							saveName();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							// Cancel: revert to original
							createNameDisplay(currentName);
						}
					});
					
					// Save on blur
					nameInput.addEventListener('blur', saveName);
				};
				
				// Add click handlers to both name and icon
				display.addEventListener('click', startEdit);
				iconContainer.addEventListener('click', startEdit);
				
				// Add hover effect to icon
				iconContainer.addEventListener('mouseenter', () => {
					setCssProps(iconContainer, { opacity: '1' });
				});
				iconContainer.addEventListener('mouseleave', () => {
					setCssProps(iconContainer, { opacity: '0.6' });
				});
			};
			
			// Create initial display
			createNameDisplay(pair.name);
			
			setting.setDesc('')
				.addExtraButton((button) => {
					// Change icon - preview with color (real-time updates)
					const iconEl = button.extraSettingsEl;
					setIcon(iconEl, pair.icon);
					// Store reference for color updates
					iconEl.setAttribute('data-command-id', pair.id);
					if (pair.color && pair.color !== '#000000') {
						setCssProps(iconEl, { color: pair.color });
					} else {
						iconEl.style.removeProperty('color');
					}
					button.setTooltip('Change icon');
					button.onClick(() => {
						const modal = new IconPickerModal(this.app, (iconId) => {
							void (async () => {
								if (iconId && iconId !== pair.icon) {
									pair.icon = iconId;
									await this.saveSettings();
									this.plugin.tabBarManager?.reorder();
									this.render(container);
								}
							})();
						});
						modal.open();
					});
				})
				.addExtraButton((button) => {
					// Move up - always show, but disable when at top
					button.setIcon('chevron-up');
					if (index > 0) {
						button.setTooltip('Move up');
						button.onClick(() => {
							void (async () => {
								arrayMoveMutable(settings.tabBarCommands, index, index - 1);
								await this.saveSettings();
								this.plugin.tabBarManager?.reorder();
								this.render(container);
							})();
						});
					} else {
						button.setTooltip('Already at top');
						button.extraSettingsEl.addClass('ui-tweaker-disabled-button');
					}
				})
				.addExtraButton((button) => {
					// Move down - always show, but disable when at bottom
					button.setIcon('chevron-down');
					if (index < settings.tabBarCommands.length - 1) {
						button.setTooltip('Move down');
						button.onClick(() => {
							void (async () => {
								arrayMoveMutable(settings.tabBarCommands, index, index + 1);
								await this.saveSettings();
								this.plugin.tabBarManager?.reorder();
								this.render(container);
							})();
						});
					} else {
						button.setTooltip('Already at bottom');
						button.extraSettingsEl.addClass('ui-tweaker-disabled-button');
					}
				})
				.addExtraButton((button) => {
					// Delete
					button.setIcon('trash');
					button.setTooltip('Delete');
					button.onClick(() => {
						void (async () => {
							settings.tabBarCommands.splice(index, 1);
							await this.saveSettings();
							await this.plugin.tabBarManager?.removeCommand(pair);
							this.render(container);
						})();
					});
				});
		});

		// Mode selection dropdown
		group.addSetting((setting): void => {
			otherSettings.push(setting.settingEl);
			setting
				.setName('Device mode')
				.setDesc('Choose which devices this command appears on')
				.addDropdown((dropdown) => {
					const appId = (this.app as { appId?: string }).appId || 'this-device';
					dropdown
						.addOption('any', 'All devices')
						.addOption('desktop', 'Desktop only')
						.addOption('mobile', 'Mobile only')
						.addOption(appId, 'This device');
					
					// Set current value - if mode is not one of the standard ones, it's "this device"
					const currentValue = (pair.mode === 'any' || pair.mode === 'desktop' || pair.mode === 'mobile') 
						? pair.mode 
						: appId;
					dropdown.setValue(currentValue);
					
					dropdown.onChange((value) => {
						void (async () => {
							pair.mode = value;
							await this.saveSettings();
							this.plugin.tabBarManager?.reorder();
							this.render(container);
						})();
					});
				});
		});

		// Custom color picker with reset button (like Commander - always show color picker)
		group.addSetting((setting): void => {
			otherSettings.push(setting.settingEl);
			const hasColor = pair.color !== undefined;
			
			setting
				.setName('Custom color')
				.setDesc('Set a custom color for this icon')
				.addColorPicker((colorPicker) => {
					// Use Commander's approach: always show color picker, default to #000 if not set
					const currentColor = pair.color ?? '#000000';
					colorPicker.setValue(currentColor);
					
					// Get the control element - color picker is added to it
					const controlEl = setting.controlEl;
					
					// Add reset button to the left of color picker if color has been set
					// Use setTimeout to ensure color picker is added first, then insert reset button before it
					if (hasColor) {
						setTimeout(() => {
							// Find the color picker element (it's typically the last child or has a specific class)
							const colorPickerEl = controlEl.querySelector('.color-picker') || controlEl.lastElementChild;
							
							const resetButton = controlEl.createEl('button', {
								cls: 'clickable-icon ui-tweaker-color-reset',
								attr: { 'aria-label': 'Reset to default color', 'title': 'Reset to default color' }
							});
							setIcon(resetButton, 'lucide-rotate-cw');
							setCssProps(resetButton, { marginRight: '0.5rem' });
							resetButton.addEventListener('click', () => {
								void (async () => {
									// Remove color entirely
									pair.color = undefined;
									
									// Update icon preview to remove color
									const iconButton = container.querySelector(`[data-command-id="${pair.id}"]`) as HTMLElement;
									if (iconButton) {
										iconButton.style.removeProperty('color');
									}
									
									await this.saveSettings();
									this.plugin.tabBarManager?.reorder();
									this.render(container);
								})();
							});
							
							// Insert reset button before color picker
							if (colorPickerEl) {
								controlEl.insertBefore(resetButton, colorPickerEl);
							} else {
								// Fallback: insert at start
								controlEl.insertBefore(resetButton, controlEl.firstChild);
							}
						}, 0);
					}
					
					colorPicker.onChange((value) => {
						// If set to black (#000000), treat as "no custom color" and remove it
						if (value === '#000000') {
							pair.color = undefined;
						} else {
							pair.color = value;
						}
						
						// Update icon preview color in real-time
						const iconButton = container.querySelector(`[data-command-id="${pair.id}"]`) as HTMLElement;
						if (iconButton) {
							if (pair.color && pair.color !== '#000000') {
								setCssProps(iconButton, { color: pair.color });
							} else {
								iconButton.style.removeProperty('color');
							}
						}
						
						// Save and reorder, then re-render to show/hide reset button
						void (async () => {
							await this.saveSettings();
							this.plugin.tabBarManager?.reorder();
							this.render(container);
						})();
					});
				});
		});

		// MD/MDX only toggle
		group.addSetting((setting): void => {
			otherSettings.push(setting.settingEl);
			
			// After all settings are added, collapse by default
			setTimeout(() => {
				otherSettings.forEach(settingEl => {
					setCssProps(settingEl, { display: 'none' });
				});
			}, 0);
			
			setting
				.setName('Only show on Markdown files')
				.setDesc('Hide this button on non-Markdown views')
				.addToggle((toggle) => {
					toggle.setValue(pair.mdOnly ?? false);
					toggle.onChange((value) => {
						void (async () => {
							pair.mdOnly = value;
							await this.saveSettings();
							this.plugin.tabBarManager?.reorder();
						})();
					});
				});
		});
	}
}
