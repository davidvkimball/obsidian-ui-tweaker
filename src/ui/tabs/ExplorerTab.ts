/**
 * Explorer Tab - Custom command buttons for file explorer navigation area
 * Based on TabBarTab, but for explorer buttons with native CSS classes
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

export class ExplorerTab extends TabRenderer {
	private expandedStates = new Map<string, boolean>();

	render(container: HTMLElement): void {
		container.empty();
		const settings = this.getSettings();
		
		// Ensure explorerCommands exists
		if (!settings.explorerCommands) {
			settings.explorerCommands = [];
		}

		// Ensure nativeExplorerButtonColors exists
		if (!settings.nativeExplorerButtonColors) {
			settings.nativeExplorerButtonColors = {
				newNote: undefined,
				newFolder: undefined,
				sortOrder: undefined,
				autoReveal: undefined,
				collapseAll: undefined,
			};
		}

		// Ensure nativeExplorerButtonIcons exists
		if (!settings.nativeExplorerButtonIcons) {
			settings.nativeExplorerButtonIcons = {
				newNote: undefined,
				newFolder: undefined,
				sortOrder: undefined,
				autoReveal: undefined,
				collapseAll: undefined,
			};
		}

		// Native explorer button controls (at the top)
		// Store reference to native buttons container for targeted re-renders
		const nativeButtonsContainer = container.createDiv({ cls: 'native-explorer-buttons-container' });
		this.renderNativeButtonControls(nativeButtonsContainer, container);

		// Separator between native buttons and custom commands (always show)
		container.createEl('hr');

		// List of commands using Setting components (like TabBarTab)
		settings.explorerCommands.forEach((pair, index) => {
			this.renderCommandItem(container, pair, index);
		});

		// Add command button (at the end)
		if (settings.explorerCommands.length > 0) {
			// Add separator
			container.createEl('hr');
		}
		
		const addGroup = createSettingsGroup(container, undefined, 'ui-tweaker');
		addGroup.addSetting((setting): void => {
			setting
				.setName('Add command')
				.setDesc('Add a new command button to the file explorer navigation area')
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
								// Push directly to settings and save
								settings.explorerCommands.push(pair);
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
							} catch {
								// User cancelled
							}
						})();
					});
				});
		});

		// Add warning message (like Commander plugin)
		const warningDiv = container.createEl('div', {
			cls: 'callout',
			attr: { 'data-callout': 'warning' }
		});
		warningDiv.createEl('p', {
			text: 'When clicking on a command in the explorer, the explorer view will become focused. This might interfere with commands that are supposed to be executed on an active file or explorer.'
		});
	}

	private renderNativeButtonControls(container: HTMLElement, mainContainer?: HTMLElement): void {
		// Clear container if re-rendering
		container.empty();
		const settings = this.getSettings();
		const group = createSettingsGroup(container, 'Native explorer buttons', 'ui-tweaker');
		
		// Use mainContainer for scroll position if provided, otherwise use container
		const scrollContainer = mainContainer || container;

		// Helper to render a native button control
		const renderNativeButton = (
			name: string,
			settingKey: 'newNoteButton' | 'newFolderButton' | 'sortOrderButton' | 'autoRevealButton' | 'collapseAllButton',
			colorKey: 'newNote' | 'newFolder' | 'sortOrder' | 'autoReveal' | 'collapseAll'
		) => {
			const isHidden = settings[settingKey];
			const color = settings.nativeExplorerButtonColors?.[colorKey];
			const iconOverride = settings.nativeExplorerButtonIcons?.[colorKey];

			group.addSetting((setting): void => {
				setting
					.setName(name)
					.setDesc('')
					.addExtraButton((button) => {
						// Eyeball toggle - eye when visible, eye-off when hidden
						const iconEl = button.extraSettingsEl;
						setIcon(iconEl, isHidden ? 'eye-off' : 'eye');
						button.setTooltip(isHidden ? 'Show button' : 'Hide button');
						button.onClick(() => {
							void (async () => {
								// Read current value from settings instead of using captured isHidden
								const currentValue = settings[settingKey];
								settings[settingKey] = !currentValue;
								await this.saveSettings();
								// Update icon and tooltip in place instead of full re-render
								const newIsHidden = settings[settingKey];
								setIcon(iconEl, newIsHidden ? 'eye-off' : 'eye');
								button.setTooltip(newIsHidden ? 'Show button' : 'Hide button');
							})();
						});
						// Prevent collapse on click
						button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
					});

				// Color picker (only show if color is set, with reset button)
				if (color) {
					setting.addColorPicker((colorPicker) => {
						colorPicker.setValue(color);
						
						const controlEl = setting.controlEl;
						
						// Prevent collapse and scroll jumping on color picker clicks
						controlEl.addEventListener('click', (e) => e.stopPropagation());
						
						// Add event handler to the actual color input element
						setTimeout(() => {
							const colorInput = controlEl.querySelector('input[type="color"]') as HTMLInputElement;
							if (colorInput) {
								colorInput.addEventListener('click', (e) => e.stopPropagation());
							}
						}, 0);
						
						// Add reset button
						setTimeout(() => {
							const colorPickerEl = controlEl.querySelector('.color-picker') || controlEl.lastElementChild;
							
							const resetButton = controlEl.createEl('button', {
								cls: 'clickable-icon ui-tweaker-color-reset',
								attr: { 'aria-label': 'Reset to default color' }
							});
							setIcon(resetButton, 'lucide-rotate-cw');
							setCssProps(resetButton, { marginRight: '0.5rem' });
							resetButton.addEventListener('click', (e) => {
								e.stopPropagation();
								e.stopImmediatePropagation();
								e.preventDefault();
								// Prevent scroll jumping
								const scrollPos = scrollContainer.scrollTop;
								void (async () => {
									if (!settings.nativeExplorerButtonColors) {
										settings.nativeExplorerButtonColors = {};
									}
									settings.nativeExplorerButtonColors[colorKey] = undefined;
									await this.saveSettings();
									// Apply colors to native buttons (remove color)
									this.plugin.explorerManager?.applyNativeIconOverrides();
									// Re-render just the native buttons section
									this.renderNativeButtonControls(container, mainContainer);
									// Restore scroll position after render
									requestAnimationFrame(() => {
										scrollContainer.scrollTop = scrollPos;
									});
								})();
							});
							
							if (colorPickerEl) {
								controlEl.insertBefore(resetButton, colorPickerEl);
							} else {
								controlEl.insertBefore(resetButton, controlEl.firstChild);
							}
						}, 0);
						
						colorPicker.onChange((value) => {
							void (async () => {
								if (!settings.nativeExplorerButtonColors) {
									settings.nativeExplorerButtonColors = {};
								}
								settings.nativeExplorerButtonColors[colorKey] = value;
								await this.saveSettings();
								// Apply colors to native buttons
								this.plugin.explorerManager?.applyNativeIconOverrides();
							})();
						});
					});
				} else {
					// Show button to add color picker
					setting.addButton((button) => {
						button.setButtonText('Set color...').onClick(() => {
							// Prevent scroll jumping
							const scrollPos = scrollContainer.scrollTop;
							// Initialize color to black to show picker
							if (!settings.nativeExplorerButtonColors) {
								settings.nativeExplorerButtonColors = {};
							}
							settings.nativeExplorerButtonColors[colorKey] = '#000000';
							void (async () => {
								await this.saveSettings();
								// Apply colors to native buttons
								this.plugin.explorerManager?.applyNativeIconOverrides();
								// Re-render just the native buttons section
								this.renderNativeButtonControls(container, mainContainer);
								// Restore scroll position after render
								requestAnimationFrame(() => {
									scrollContainer.scrollTop = scrollPos;
								});
							})();
						});
						// Prevent collapse on button click
						button.buttonEl.addEventListener('click', (e) => e.stopPropagation());
					});
				}

				// Icon override (always show icon picker button)
				setting.addButton((button) => {
					const currentIcon = iconOverride || 'Default';
					button.setButtonText(currentIcon === 'Default' ? 'Set icon...' : currentIcon).onClick(() => {
						const modal = new IconPickerModal(this.app, (iconId) => {
							void (async () => {
								// Prevent scroll jumping
								const scrollPos = scrollContainer.scrollTop;
								if (!settings.nativeExplorerButtonIcons) {
									settings.nativeExplorerButtonIcons = {};
								}
								if (iconId) {
									settings.nativeExplorerButtonIcons[colorKey] = iconId;
								} else {
									settings.nativeExplorerButtonIcons[colorKey] = undefined;
								}
								await this.saveSettings();
								// Apply icon override to native buttons
								this.plugin.explorerManager?.applyNativeIconOverrides();
								// Re-render just the native buttons section
								this.renderNativeButtonControls(container, mainContainer);
								// Restore scroll position after render
								requestAnimationFrame(() => {
									scrollContainer.scrollTop = scrollPos;
								});
							})();
						});
						modal.open();
					});
					// Prevent collapse on button click
					button.buttonEl.addEventListener('click', (e) => e.stopPropagation());
					
					// Add reset button if icon is set
					if (iconOverride) {
						setTimeout(() => {
							const controlEl = setting.controlEl;
							const buttonEl = controlEl.querySelector('button') || controlEl.lastElementChild;
							
							const resetButton = controlEl.createEl('button', {
								cls: 'clickable-icon ui-tweaker-icon-reset',
								attr: { 'aria-label': 'Reset to default icon' }
							});
							setIcon(resetButton, 'lucide-rotate-cw');
							setCssProps(resetButton, { marginRight: '0.5rem' });
							resetButton.addEventListener('click', (e) => {
								e.stopPropagation();
								e.stopImmediatePropagation();
								e.preventDefault();
								// Prevent scroll jumping
								const scrollPos = scrollContainer.scrollTop;
								void (async () => {
									if (!settings.nativeExplorerButtonIcons) {
										settings.nativeExplorerButtonIcons = {};
									}
									settings.nativeExplorerButtonIcons[colorKey] = undefined;
									await this.saveSettings();
									// Apply icon override to native buttons (remove override)
									this.plugin.explorerManager?.applyNativeIconOverrides();
									// Re-render just the native buttons section
									this.renderNativeButtonControls(container, mainContainer);
									// Restore scroll position after render
									requestAnimationFrame(() => {
										scrollContainer.scrollTop = scrollPos;
									});
								})();
							});
							
							// Insert reset button before the main button
							if (buttonEl) {
								controlEl.insertBefore(resetButton, buttonEl);
							} else {
								controlEl.insertBefore(resetButton, controlEl.firstChild);
							}
						}, 0);
					}
				});
			});
		};

		// Render all 5 native buttons
		renderNativeButton('New note', 'newNoteButton', 'newNote');
		renderNativeButton('New folder', 'newFolderButton', 'newFolder');
		renderNativeButton('Sort order', 'sortOrderButton', 'sortOrder');
		renderNativeButton('Auto-reveal', 'autoRevealButton', 'autoReveal');
		renderNativeButton('Collapse all', 'collapseAllButton', 'collapseAll');
	}

	private renderCommandItem(container: HTMLElement, pair: CommandIconPair, index: number): void {
		const settings = this.getSettings();
		const group = createSettingsGroup(container, undefined, 'ui-tweaker');
		
		// Store reference to other settings for collapsible functionality
		const otherSettings: HTMLElement[] = [];
		
		// Command name with editable name (like Vault CMS) and icon preview with color
		const displayName = pair.displayName || pair.name;
		group.addSetting((setting): void => {
			// Completely prevent collapse on setting element - ONLY chevron can toggle
			// Use capture phase to intercept ALL clicks before they reach Obsidian's handlers
			setting.settingEl.addEventListener('click', (e) => {
				const target = e.target as HTMLElement;
				// Allow collapse if clicking on chevron icon OR on extra buttons (delete, move up/down, etc.)
				// OR on name display/pencil icon for renaming
				const isChevronClick = target.closest('.ui-tweaker-collapse-icon') !== null;
				const isExtraButton = target.closest('.extra-setting-button') !== null || target.closest('.clickable-icon.extra-setting-button') !== null;
				const isNameEdit = target.closest('.ui-tweaker-name-display') !== null || target.closest('.ui-tweaker-edit-icon') !== null || target.closest('.ui-tweaker-editable-name') !== null;
				if (!isChevronClick && !isExtraButton && !isNameEdit) {
					// Block ALL other clicks from affecting collapse
					e.stopPropagation();
					e.stopImmediatePropagation();
					e.preventDefault();
					return false;
				}
			}, true); // Capture phase - runs before other handlers
			
			// Also prevent on bubble phase as backup
			setting.settingEl.addEventListener('click', (e) => {
				const target = e.target as HTMLElement;
				const isChevronClick = target.closest('.ui-tweaker-collapse-icon') !== null;
				const isExtraButton = target.closest('.extra-setting-button') !== null || target.closest('.clickable-icon.extra-setting-button') !== null;
				const isNameEdit = target.closest('.ui-tweaker-name-display') !== null || target.closest('.ui-tweaker-edit-icon') !== null || target.closest('.ui-tweaker-editable-name') !== null;
				if (!isChevronClick && !isExtraButton && !isNameEdit) {
					e.stopPropagation();
					e.stopImmediatePropagation();
					e.preventDefault();
					return false;
				}
			}, false); // Bubble phase - backup
			
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
			// Restore collapse state from Map, default to false if not set
			let isExpanded = this.expandedStates.get(pair.id) ?? false;
			setIcon(chevronContainer, isExpanded ? 'chevrons-down-up' : 'chevrons-up-down');
			
			// Toggle on chevron click - ONLY way to change collapse state
			chevronContainer.addEventListener('click', (e) => {
				e.stopPropagation();
				e.stopImmediatePropagation();
				e.preventDefault();
				isExpanded = !isExpanded;
				// Store state in Map for persistence across re-renders
				this.expandedStates.set(pair.id, isExpanded);
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
						this.plugin.explorerManager?.updateButtonNames();
						
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
					iconEl.setAttribute('data-explorer-command-id', pair.id);
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
									this.plugin.explorerManager?.reorder();
									this.render(container);
								}
							})();
						});
						modal.open();
					});
					// Prevent collapse on click
					button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
				})
				.addExtraButton((button) => {
					// Move up - always show, but disable when at top
					button.setIcon('chevron-up');
					if (index > 0) {
						button.setTooltip('Move up');
						button.onClick(() => {
							void (async () => {
								arrayMoveMutable(settings.explorerCommands, index, index - 1);
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
							})();
						});
					} else {
						button.setTooltip('Already at top');
						button.extraSettingsEl.addClass('ui-tweaker-disabled-button');
						// Prevent hover effects on disabled buttons
						setCssProps(button.extraSettingsEl, { pointerEvents: 'none' });
					}
					// Prevent collapse on click
					button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
				})
				.addExtraButton((button) => {
					// Move down - always show, but disable when at bottom
					button.setIcon('chevron-down');
					if (index < settings.explorerCommands.length - 1) {
						button.setTooltip('Move down');
						button.onClick(() => {
							void (async () => {
								arrayMoveMutable(settings.explorerCommands, index, index + 1);
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
							})();
						});
					} else {
						button.setTooltip('Already at bottom');
						button.extraSettingsEl.addClass('ui-tweaker-disabled-button');
						// Prevent hover effects on disabled buttons
						setCssProps(button.extraSettingsEl, { pointerEvents: 'none' });
					}
					// Prevent collapse on click
					button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
				})
				.addExtraButton((button) => {
					// Delete - red/warning style
					button.setIcon('trash');
					button.setTooltip('Delete');
					button.extraSettingsEl.addClass('mod-warning');
					// Make icon red
					setCssProps(button.extraSettingsEl, { color: 'var(--text-error)' });
					button.onClick(() => {
						void (async () => {
							const idx = settings.explorerCommands.indexOf(pair);
							if (idx > -1) {
								settings.explorerCommands.splice(idx, 1);
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
							}
						})();
					});
					// Prevent collapse on click
					button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
				});
		});

		// Device mode dropdown
		group.addSetting((setting): void => {
			otherSettings.push(setting.settingEl);
			setting
				.setName('Device mode')
				.setDesc('Choose which devices this button appears on')
				.addDropdown((dropdown) => {
					const appId = (this.app as { appId?: string }).appId || 'this-device';
					dropdown
						.addOption('any', 'All devices')
						.addOption('desktop', 'Desktop only')
						.addOption('mobile', 'Mobile only')
						.addOption(appId, 'This device')
						.setValue(pair.mode || 'any')
						.onChange((value) => {
							void (async () => {
								pair.mode = value;
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
							})();
						});
					// Prevent collapse on click
					dropdown.selectEl.addEventListener('click', (e) => e.stopPropagation());
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
					
					// Prevent collapse on color picker clicks
					controlEl.addEventListener('click', (e) => e.stopPropagation());
					
					// Add event handler to the actual color input element
					setTimeout(() => {
						const colorInput = controlEl.querySelector('input[type="color"]') as HTMLInputElement;
						if (colorInput) {
							colorInput.addEventListener('click', (e) => e.stopPropagation());
						}
					}, 0);
					
					// Add reset button to the left of color picker if color has been set
					// Use setTimeout to ensure color picker is added first, then insert reset button before it
					if (hasColor) {
						setTimeout(() => {
							// Find the color picker element (it's typically the last child or has a specific class)
							const colorPickerEl = controlEl.querySelector('.color-picker') || controlEl.lastElementChild;
							
							const resetButton = controlEl.createEl('button', {
								cls: 'clickable-icon ui-tweaker-color-reset',
								attr: { 'aria-label': 'Reset to default color' }
							});
							setIcon(resetButton, 'lucide-rotate-cw');
							setCssProps(resetButton, { marginRight: '0.5rem' });
							resetButton.addEventListener('click', (e) => {
								e.stopPropagation();
								e.stopImmediatePropagation();
								e.preventDefault();
								void (async () => {
									// Remove color entirely
									pair.color = undefined;
									
									// Update icon preview to remove color
									const iconButton = container.querySelector(`[data-explorer-command-id="${pair.id}"]`) as HTMLElement;
									if (iconButton) {
										iconButton.style.removeProperty('color');
									}
									
									await this.saveSettings();
									this.plugin.explorerManager?.reorder();
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
						const iconButton = container.querySelector(`[data-explorer-command-id="${pair.id}"]`) as HTMLElement;
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
							this.plugin.explorerManager?.reorder();
							this.render(container);
						})();
					});
				});
		});

		// Toggle icon configuration
		group.addSetting((setting): void => {
			otherSettings.push(setting.settingEl);
			const hasToggleIcon = pair.toggleIcon !== undefined;
			
			setting
				.setName('Toggle icon')
				.setDesc('Icon to show when command is toggled on (leave empty to disable toggle). Commands with check callback work automatically. See readme for plugin developer compatibility notes.')
				.setTooltip('For plugin developers: Commands with checkCallback work automatically. See https://github.com/davidvkimball/obsidian-ui-tweaker#toggle-icon-feature-compatibility for details.')
				.addButton((button) => {
					const currentToggleIcon = pair.toggleIcon || 'None';
					button.setButtonText(currentToggleIcon === 'None' ? 'Set toggle icon...' : currentToggleIcon).onClick(() => {
						const modal = new IconPickerModal(this.app, (iconId) => {
							void (async () => {
								if (iconId) {
									pair.toggleIcon = iconId;
								} else {
									pair.toggleIcon = undefined;
								}
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
							})();
						});
						modal.open();
					});
					// Prevent collapse on click
					button.buttonEl.addEventListener('click', (e) => e.stopPropagation());
					
					// Add reset button if toggle icon is set
					if (hasToggleIcon) {
						setTimeout(() => {
							const controlEl = setting.controlEl;
							const buttonEl = controlEl.querySelector('button') || controlEl.lastElementChild;
							
							const resetButton = controlEl.createEl('button', {
								cls: 'clickable-icon ui-tweaker-toggle-icon-reset',
								attr: { 'aria-label': 'Reset toggle icon' }
							});
							setIcon(resetButton, 'lucide-rotate-cw');
							setCssProps(resetButton, { marginRight: '0.5rem' });
							resetButton.addEventListener('click', (e) => {
								e.stopPropagation();
								e.stopImmediatePropagation();
								e.preventDefault();
								// Preserve scroll position to prevent jumping
								const scrollContainer = container.closest('.vertical-tab-content') || 
									container.closest('.settings-content') || 
									container.closest('.vertical-tab-content-container') ||
									container;
								const scrollPos = scrollContainer.scrollTop;
								void (async () => {
									// Remove toggle icon
									pair.toggleIcon = undefined;
									
									await this.saveSettings();
									this.plugin.explorerManager?.reorder();
									this.render(container);
									// Restore scroll position after render with multiple attempts
									requestAnimationFrame(() => {
										scrollContainer.scrollTop = scrollPos;
										// Also try after a short delay in case DOM isn't ready
										setTimeout(() => {
											scrollContainer.scrollTop = scrollPos;
										}, 0);
									});
								})();
							});
							
							// Insert reset button before the main button
							if (buttonEl) {
								controlEl.insertBefore(resetButton, buttonEl);
							} else {
								controlEl.insertBefore(resetButton, controlEl.firstChild);
							}
						}, 0);
					}
				});
		});

		// Use active class option (explorer only)
		group.addSetting((setting): void => {
			otherSettings.push(setting.settingEl);
			setting
				.setName('Use active class instead of icon swap')
				.setDesc('When toggled on, add is-active class instead of swapping icon (explorer only)')
				.addToggle((toggle) => {
					toggle.setValue(pair.useActiveClass ?? false);
					toggle.onChange((value) => {
						void (async () => {
							pair.useActiveClass = value;
							await this.saveSettings();
							this.plugin.explorerManager?.reorder();
							this.render(container);
						})();
					});
					// Prevent collapse on click
					toggle.toggleEl.addEventListener('click', (e) => e.stopPropagation());
				});
		});

			// After all settings are added, apply collapse state from Map
		setTimeout(() => {
			const savedExpanded = this.expandedStates.get(pair.id) ?? false;
			otherSettings.forEach(settingEl => {
				setCssProps(settingEl, { display: savedExpanded ? '' : 'none' });
			});
		}, 0);
	}
}
