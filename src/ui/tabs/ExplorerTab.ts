/**
 * Explorer Tab - Custom command buttons for file explorer navigation area
 * Based on TabBarTab, but for explorer buttons with native CSS classes
 */

import { setIcon } from 'obsidian';
import { TabRenderer } from '../common/TabRenderer';
import { createSettingsGroup } from '../../utils/settings-compat';
import { CommandIconPair, ExplorerButtonItem } from '../../types';
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

		// Ensure explorerButtonItems exists
		if (!settings.explorerButtonItems) {
			settings.explorerButtonItems = [];
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

		// Don't trigger consolidation on render - only when settings actually change
		// This prevents flickering when opening settings

		// Unified list of all buttons (native, external, custom)
		settings.explorerButtonItems.forEach((item, index) => {
			this.renderButtonItem(container, item, index);
		});

		// Add command button (at the end)
		if (settings.explorerButtonItems.length > 0) {
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
								// Push to explorerCommands
								settings.explorerCommands.push(pair);
								// Create corresponding ExplorerButtonItem
								const item: ExplorerButtonItem = {
									id: `custom-${pair.id}`,
									name: pair.name,
									ariaLabel: pair.name,
									type: 'custom',
									commandId: pair.id,
									icon: pair.icon,
									displayName: pair.displayName,
									mode: pair.mode,
									color: pair.color,
									showOnFileTypes: pair.showOnFileTypes,
									hideOnFileTypes: pair.hideOnFileTypes,
									toggleIcon: pair.toggleIcon,
									useActiveClass: pair.useActiveClass,
									hidden: false,
								};
								settings.explorerButtonItems.push(item);
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

	private renderButtonItem(container: HTMLElement, item: ExplorerButtonItem, index: number): void {
		const settings = this.getSettings();
		const group = createSettingsGroup(container, undefined, 'ui-tweaker');
		
		// Store reference to other settings for collapsible functionality
		const otherSettings: HTMLElement[] = [];

		// Get the command pair for custom commands
		const pair = item.type === 'custom' && item.commandId 
			? settings.explorerCommands.find(c => c.id === item.commandId)
			: null;

		// Determine display name
		const displayName = item.type === 'custom' && pair 
			? (pair.displayName || pair.name)
			: item.name;

		// Map native button IDs to setting keys
		const nativeButtonMap: Record<string, { settingKey: 'newNoteButton' | 'newFolderButton' | 'sortOrderButton' | 'autoRevealButton' | 'collapseAllButton', colorKey: 'newNote' | 'newFolder' | 'sortOrder' | 'autoReveal' | 'collapseAll' }> = {
			'native-newNote': { settingKey: 'newNoteButton', colorKey: 'newNote' },
			'native-newFolder': { settingKey: 'newFolderButton', colorKey: 'newFolder' },
			'native-sortOrder': { settingKey: 'sortOrderButton', colorKey: 'sortOrder' },
			'native-autoReveal': { settingKey: 'autoRevealButton', colorKey: 'autoReveal' },
			'native-collapseAll': { settingKey: 'collapseAllButton', colorKey: 'collapseAll' },
		};

		const nativeButtonInfo = item.type === 'native' ? nativeButtonMap[item.id] : null;
		const isHidden = nativeButtonInfo ? settings[nativeButtonInfo.settingKey] : item.hidden;
		const color = nativeButtonInfo 
			? settings.nativeExplorerButtonColors?.[nativeButtonInfo.colorKey]
			: (item.color && item.color !== '#000000' ? item.color : undefined);
		const iconOverride = nativeButtonInfo
			? settings.nativeExplorerButtonIcons?.[nativeButtonInfo.colorKey]
			: (item.icon || undefined);

		group.addSetting((setting): void => {
			// Completely prevent collapse on setting element - ONLY chevron can toggle (if present)
			// For external buttons, prevent all collapse since there's no chevron
			if (item.type === 'external') {
				setting.settingEl.addEventListener('click', (e) => {
					const target = e.target as HTMLElement;
					const isExtraButton = target.closest('.extra-setting-button') !== null || target.closest('.clickable-icon.extra-setting-button') !== null;
					if (!isExtraButton) {
						e.stopPropagation();
						e.stopImmediatePropagation();
						e.preventDefault();
						return false;
					}
				}, true);
				
				setting.settingEl.addEventListener('click', (e) => {
					const target = e.target as HTMLElement;
					const isExtraButton = target.closest('.extra-setting-button') !== null || target.closest('.clickable-icon.extra-setting-button') !== null;
					if (!isExtraButton) {
						e.stopPropagation();
						e.stopImmediatePropagation();
						e.preventDefault();
						return false;
					}
				}, false);
			} else {
				// For native and custom buttons, allow chevron to toggle
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
				}, true);
				
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
				}, false);
			}
			
			// Make nameEl a flex container so chevron can be positioned to the left
			const nameEl = setting.nameEl;
			setCssProps(nameEl, { display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' });
			
			// Add chevrons-up-down icon to the LEFT of the name (only for native and custom buttons)
			let chevronContainer: HTMLElement | null = null;
			let isExpanded = false;
			if (item.type === 'native' || item.type === 'custom') {
				chevronContainer = document.createElement('div');
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
				nameEl.insertBefore(chevronContainer, nameEl.firstChild);
				isExpanded = this.expandedStates.get(item.id) ?? false;
				setIcon(chevronContainer, isExpanded ? 'chevrons-down-up' : 'chevrons-up-down');
				
				// Toggle on chevron click
				chevronContainer.addEventListener('click', (e) => {
					e.stopPropagation();
					e.stopImmediatePropagation();
					e.preventDefault();
					isExpanded = !isExpanded;
					this.expandedStates.set(item.id, isExpanded);
					setIcon(chevronContainer!, isExpanded ? 'chevrons-down-up' : 'chevrons-up-down');
					otherSettings.forEach(settingEl => {
						setCssProps(settingEl, { display: isExpanded ? '' : 'none' });
					});
				});
			}
			
			// Create name container (editable only for custom buttons)
			const nameContainer = nameEl.createDiv({ cls: 'ui-tweaker-editable-name' });
			setCssProps(nameContainer, { display: 'flex', alignItems: 'center', gap: '0.5rem' });
			
			// Function to create the display element with click handler
			const createNameDisplay = (name: string) => {
				nameContainer.empty();
				
				const display = nameContainer.createSpan({ 
					text: name === displayName ? name : `${name} (${displayName})`,
					cls: 'ui-tweaker-name-display'
				});
				
				// Add pencil icon (only for custom buttons, not external)
				if (item.type === 'custom') {
					const iconContainer = nameContainer.createDiv({ cls: 'ui-tweaker-edit-icon' });
					setCssProps(iconContainer, { opacity: '0.6' });
					setIcon(iconContainer, 'lucide-pencil-line');
					
					// Make name and icon editable on click
					const startEdit = () => {
						const currentName = item.name;
						
						nameContainer.empty();
						
						const nameInput = nameContainer.createEl('input', {
							type: 'text',
							value: currentName
						});
						nameInput.addClass('mod-text-input');
						
						nameInput.focus();
						nameInput.select();
						
						const saveName = () => {
							nameInput.removeEventListener('blur', saveName);
							
							let newName = nameInput.value.trim();
							if (!newName) {
								newName = currentName;
							}
							item.name = newName;
							
							// Update command pair name if custom
							if (pair) {
								pair.name = newName;
							}
							
							// Update button names
							this.plugin.explorerManager?.updateButtonNames();
							
							void (async () => {
								await this.saveSettings();
								this.render(container);
							})();
						};
						
						nameInput.addEventListener('keydown', (e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								saveName();
							} else if (e.key === 'Escape') {
								e.preventDefault();
								createNameDisplay(currentName);
							}
						});
						
						nameInput.addEventListener('blur', saveName);
					};
					
					display.addEventListener('click', startEdit);
					iconContainer.addEventListener('click', startEdit);
					
					iconContainer.addEventListener('mouseenter', () => {
						setCssProps(iconContainer, { opacity: '1' });
					});
					iconContainer.addEventListener('mouseleave', () => {
						setCssProps(iconContainer, { opacity: '0.6' });
					});
				}
			};
			
			// Create initial display
			createNameDisplay(item.name);
			
			setting.setDesc('')
				.addExtraButton((button) => {
					// Icon preview (for custom commands and native with overrides)
					if (item.type === 'custom' && pair) {
						const iconEl = button.extraSettingsEl;
						setIcon(iconEl, pair.icon);
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
										item.icon = iconId;
										await this.saveSettings();
										this.plugin.explorerManager?.reorder();
										this.render(container);
									}
								})();
							});
							modal.open();
						});
					} else if (item.type === 'native' && iconOverride) {
						const iconEl = button.extraSettingsEl;
						setIcon(iconEl, iconOverride);
						button.setTooltip('Change icon');
						button.onClick(() => {
							const modal = new IconPickerModal(this.app, (iconId) => {
								void (async () => {
									if (!nativeButtonInfo) return;
									if (!settings.nativeExplorerButtonIcons) {
										settings.nativeExplorerButtonIcons = {};
									}
									if (iconId) {
										settings.nativeExplorerButtonIcons[nativeButtonInfo.colorKey] = iconId;
									} else {
										settings.nativeExplorerButtonIcons[nativeButtonInfo.colorKey] = undefined;
									}
									await this.saveSettings();
									this.plugin.explorerManager?.applyNativeIconOverrides();
									this.render(container);
								})();
							});
							modal.open();
						});
					} else {
						// No icon preview for external buttons or native without override
						setCssProps(button.extraSettingsEl, { display: 'none' });
					}
					// Prevent icon flickering on hover by not updating on hover
					button.extraSettingsEl.addEventListener('mouseenter', (e) => e.stopPropagation());
					button.extraSettingsEl.addEventListener('mouseleave', (e) => e.stopPropagation());
					button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
				})
				.addExtraButton((button) => {
					// Move up
					button.setIcon('chevron-up');
					if (index > 0) {
						button.setTooltip('Move up');
						button.onClick(() => {
							// Preserve scroll position to prevent flickering
							const scrollContainer = container.closest('.vertical-tab-content') || 
								container.closest('.settings-content') || 
								container.closest('.vertical-tab-content-container') ||
								container;
							const scrollPos = scrollContainer.scrollTop;
							void (async () => {
								arrayMoveMutable(settings.explorerButtonItems, index, index - 1);
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
								// Restore scroll position after render with multiple attempts
								requestAnimationFrame(() => {
									scrollContainer.scrollTop = scrollPos;
									// Also try after a short delay in case DOM isn't ready
									setTimeout(() => {
										scrollContainer.scrollTop = scrollPos;
										// One more attempt after a longer delay
										setTimeout(() => {
											scrollContainer.scrollTop = scrollPos;
										}, 50);
									}, 0);
								});
							})();
						});
					} else {
						button.setTooltip('Already at top');
						button.extraSettingsEl.addClass('ui-tweaker-disabled-button');
						setCssProps(button.extraSettingsEl, { pointerEvents: 'none' });
					}
					button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
				})
				.addExtraButton((button) => {
					// Move down
					button.setIcon('chevron-down');
					if (index < settings.explorerButtonItems.length - 1) {
						button.setTooltip('Move down');
						button.onClick(() => {
							// Preserve scroll position to prevent flickering
							const scrollContainer = container.closest('.vertical-tab-content') || 
								container.closest('.settings-content') || 
								container.closest('.vertical-tab-content-container') ||
								container;
							const scrollPos = scrollContainer.scrollTop;
							void (async () => {
								arrayMoveMutable(settings.explorerButtonItems, index, index + 1);
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
								// Restore scroll position after render with multiple attempts
								requestAnimationFrame(() => {
									scrollContainer.scrollTop = scrollPos;
									// Also try after a short delay in case DOM isn't ready
									setTimeout(() => {
										scrollContainer.scrollTop = scrollPos;
										// One more attempt after a longer delay
										setTimeout(() => {
											scrollContainer.scrollTop = scrollPos;
										}, 50);
									}, 0);
								});
							})();
						});
					} else {
						button.setTooltip('Already at bottom');
						button.extraSettingsEl.addClass('ui-tweaker-disabled-button');
						setCssProps(button.extraSettingsEl, { pointerEvents: 'none' });
					}
					button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
				});

			// Delete button (only for custom commands)
			if (item.type === 'custom') {
				setting.addExtraButton((button) => {
					button.setIcon('trash');
					button.setTooltip('Delete');
					button.extraSettingsEl.addClass('mod-warning');
					setCssProps(button.extraSettingsEl, { color: 'var(--text-error)' });
					button.onClick(() => {
						void (async () => {
							// Remove from both arrays
							const itemIdx = settings.explorerButtonItems.indexOf(item);
							if (itemIdx > -1) {
								settings.explorerButtonItems.splice(itemIdx, 1);
							}
							if (pair) {
								const cmdIdx = settings.explorerCommands.indexOf(pair);
								if (cmdIdx > -1) {
									settings.explorerCommands.splice(cmdIdx, 1);
								}
							}
							await this.saveSettings();
							this.plugin.explorerManager?.reorder();
							this.render(container);
						})();
					});
					button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
				});
			}

			// Hide/Show toggle (for native and external buttons)
			if ((item.type === 'native' && nativeButtonInfo) || item.type === 'external') {
				setting.addExtraButton((button) => {
					const iconEl = button.extraSettingsEl;
					setIcon(iconEl, isHidden ? 'eye-off' : 'eye');
					button.setTooltip(isHidden ? 'Show button' : 'Hide button');
					button.onClick(() => {
						void (async () => {
							if (item.type === 'native' && nativeButtonInfo) {
								settings[nativeButtonInfo.settingKey] = !settings[nativeButtonInfo.settingKey];
								item.hidden = settings[nativeButtonInfo.settingKey];
							} else if (item.type === 'external') {
								item.hidden = !item.hidden;
							}
							await this.saveSettings();
							const newIsHidden = item.hidden;
							setIcon(iconEl, newIsHidden ? 'eye-off' : 'eye');
							button.setTooltip(newIsHidden ? 'Show button' : 'Hide button');
							this.plugin.explorerManager?.reorder();
						})();
					});
					button.extraSettingsEl.addEventListener('click', (e) => e.stopPropagation());
				});
			}
		});

		// Collapsible settings section (only for native and custom)
		if (item.type === 'native' || item.type === 'custom') {
			// Color picker
			if (item.type === 'native' && nativeButtonInfo) {
				group.addSetting((setting): void => {
					otherSettings.push(setting.settingEl);
					const hasColor = color !== undefined;
					
					setting
						.setName('Custom color')
						.setDesc('Set a custom color for this icon')
						.addColorPicker((colorPicker) => {
							const currentColor = color ?? '#000000';
							colorPicker.setValue(currentColor);
							
							const controlEl = setting.controlEl;
							controlEl.addEventListener('click', (e) => e.stopPropagation());
							
							setTimeout(() => {
								const colorInput = controlEl.querySelector('input[type="color"]') as HTMLInputElement;
								if (colorInput) {
									colorInput.addEventListener('click', (e) => e.stopPropagation());
								}
							}, 0);
							
							if (hasColor) {
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
										void (async () => {
											if (!settings.nativeExplorerButtonColors) {
												settings.nativeExplorerButtonColors = {};
											}
											settings.nativeExplorerButtonColors[nativeButtonInfo.colorKey] = undefined;
											await this.saveSettings();
											this.plugin.explorerManager?.applyNativeIconOverrides();
											this.render(container);
										})();
									});
									if (colorPickerEl) {
										controlEl.insertBefore(resetButton, colorPickerEl);
									}
								}, 0);
							}
							
							colorPicker.onChange((value) => {
								void (async () => {
									if (!settings.nativeExplorerButtonColors) {
										settings.nativeExplorerButtonColors = {};
									}
									const newColor = value === '#000000' ? undefined : value;
									settings.nativeExplorerButtonColors[nativeButtonInfo.colorKey] = newColor;
									await this.saveSettings();
									this.plugin.explorerManager?.applyNativeIconOverrides();
									
									// Update reset button visibility without full re-render
									const existingReset = controlEl.querySelector('.ui-tweaker-color-reset');
									if (newColor && !existingReset) {
										// Add reset button
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
												if (!settings.nativeExplorerButtonColors) {
													settings.nativeExplorerButtonColors = {};
												}
												settings.nativeExplorerButtonColors[nativeButtonInfo.colorKey] = undefined;
												await this.saveSettings();
												this.plugin.explorerManager?.applyNativeIconOverrides();
												this.render(container);
											})();
										});
										if (colorPickerEl) {
											controlEl.insertBefore(resetButton, colorPickerEl);
										}
									} else if (!newColor && existingReset) {
										// Remove reset button
										existingReset.remove();
									}
								})();
							});
						});
				});

				// Icon override
				group.addSetting((setting): void => {
					otherSettings.push(setting.settingEl);
					const hasIconOverride = iconOverride !== undefined;
					
					setting
						.setName('Icon override')
						.setDesc('Override the default icon for this button')
						.addButton((button) => {
							const currentIcon = iconOverride || 'Default';
							button.setButtonText(currentIcon === 'Default' ? 'Set icon...' : currentIcon).onClick(() => {
								const modal = new IconPickerModal(this.app, (iconId) => {
									void (async () => {
										if (!settings.nativeExplorerButtonIcons) {
											settings.nativeExplorerButtonIcons = {};
										}
										if (iconId) {
											settings.nativeExplorerButtonIcons[nativeButtonInfo.colorKey] = iconId;
										} else {
											settings.nativeExplorerButtonIcons[nativeButtonInfo.colorKey] = undefined;
										}
										await this.saveSettings();
										this.plugin.explorerManager?.applyNativeIconOverrides();
										this.render(container);
									})();
								});
								modal.open();
							});
							button.buttonEl.addEventListener('click', (e) => e.stopPropagation());
							
							// Add reset button if icon override is set
							if (hasIconOverride) {
								setTimeout(() => {
									const controlEl = setting.controlEl;
									const buttonEl = controlEl.querySelector('button') || controlEl.lastElementChild;
									
									const resetButton = controlEl.createEl('button', {
										cls: 'clickable-icon ui-tweaker-icon-override-reset',
										attr: { 'aria-label': 'Reset icon override' }
									});
									setIcon(resetButton, 'lucide-rotate-cw');
									setCssProps(resetButton, { marginRight: '0.5rem' });
									resetButton.addEventListener('click', (e) => {
										e.stopPropagation();
										e.stopImmediatePropagation();
										e.preventDefault();
										void (async () => {
											if (!settings.nativeExplorerButtonIcons) {
												settings.nativeExplorerButtonIcons = {};
											}
											settings.nativeExplorerButtonIcons[nativeButtonInfo.colorKey] = undefined;
											await this.saveSettings();
											this.plugin.explorerManager?.applyNativeIconOverrides();
											this.render(container);
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
			} else if (item.type === 'custom' && pair) {
				// Custom command settings (device mode, color, toggle icon, etc.)
				// Device mode
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
										item.mode = value;
										await this.saveSettings();
										this.plugin.explorerManager?.reorder();
										this.render(container);
									})();
								});
							dropdown.selectEl.addEventListener('click', (e) => e.stopPropagation());
						});
				});

				// Custom color picker
				group.addSetting((setting): void => {
					otherSettings.push(setting.settingEl);
					const hasColor = pair.color !== undefined;
					
					setting
						.setName('Custom color')
						.setDesc('Set a custom color for this icon')
						.addColorPicker((colorPicker) => {
							const currentColor = pair.color ?? '#000000';
							colorPicker.setValue(currentColor);
							
							const controlEl = setting.controlEl;
							controlEl.addEventListener('click', (e) => e.stopPropagation());
							
							setTimeout(() => {
								const colorInput = controlEl.querySelector('input[type="color"]') as HTMLInputElement;
								if (colorInput) {
									colorInput.addEventListener('click', (e) => e.stopPropagation());
								}
							}, 0);
							
							if (hasColor) {
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
										void (async () => {
											pair.color = undefined;
											item.color = undefined;
											await this.saveSettings();
											this.plugin.explorerManager?.reorder();
											this.render(container);
										})();
									});
									if (colorPickerEl) {
										controlEl.insertBefore(resetButton, colorPickerEl);
									}
								}, 0);
							}
							
							colorPicker.onChange((value) => {
								const newColor = value === '#000000' ? undefined : value;
								pair.color = newColor;
								item.color = newColor;
								
								// Update icon preview color in real-time
								const iconButton = container.querySelector(`[data-explorer-command-id="${pair.id}"]`) as HTMLElement;
								if (iconButton) {
									if (newColor && newColor !== '#000000') {
										setCssProps(iconButton, { color: newColor });
									} else {
										iconButton.style.removeProperty('color');
									}
								}
								
								// Update reset button visibility without full re-render
								const controlEl = setting.controlEl;
								const existingReset = controlEl.querySelector('.ui-tweaker-color-reset');
								if (newColor && !existingReset) {
									// Add reset button
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
											pair.color = undefined;
											item.color = undefined;
											await this.saveSettings();
											this.plugin.explorerManager?.reorder();
											this.render(container);
										})();
									});
									if (colorPickerEl) {
										controlEl.insertBefore(resetButton, colorPickerEl);
									}
								} else if (!newColor && existingReset) {
									// Remove reset button
									existingReset.remove();
								}
								
								void (async () => {
									await this.saveSettings();
									this.plugin.explorerManager?.reorder();
								})();
							});
						});
				});

				// Toggle icon configuration
				group.addSetting((setting): void => {
					otherSettings.push(setting.settingEl);
					
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
											item.toggleIcon = iconId;
										} else {
											pair.toggleIcon = undefined;
											item.toggleIcon = undefined;
										}
										await this.saveSettings();
										this.plugin.explorerManager?.reorder();
										this.render(container);
									})();
								});
								modal.open();
							});
							button.buttonEl.addEventListener('click', (e) => e.stopPropagation());
						});
				});

				// Use active class option
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
									item.useActiveClass = value;
									await this.saveSettings();
									this.plugin.explorerManager?.reorder();
									this.render(container);
								})();
							});
							toggle.toggleEl.addEventListener('click', (e) => e.stopPropagation());
						});
				});
			}
		}

		// Apply collapse state
		setTimeout(() => {
			const savedExpanded = this.expandedStates.get(item.id) ?? false;
			otherSettings.forEach(settingEl => {
				setCssProps(settingEl, { display: savedExpanded ? '' : 'none' });
			});
		}, 0);
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
							// Preserve scroll position to prevent flickering
							const scrollContainer = container.closest('.vertical-tab-content') || 
								container.closest('.settings-content') || 
								container.closest('.vertical-tab-content-container') ||
								container;
							const scrollPos = scrollContainer.scrollTop;
							void (async () => {
								arrayMoveMutable(settings.explorerCommands, index, index - 1);
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
								// Restore scroll position after render with multiple attempts
								requestAnimationFrame(() => {
									scrollContainer.scrollTop = scrollPos;
									// Also try after a short delay in case DOM isn't ready
									setTimeout(() => {
										scrollContainer.scrollTop = scrollPos;
										// One more attempt after a longer delay
										setTimeout(() => {
											scrollContainer.scrollTop = scrollPos;
										}, 50);
									}, 0);
								});
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
							// Preserve scroll position to prevent flickering
							const scrollContainer = container.closest('.vertical-tab-content') || 
								container.closest('.settings-content') || 
								container.closest('.vertical-tab-content-container') ||
								container;
							const scrollPos = scrollContainer.scrollTop;
							void (async () => {
								arrayMoveMutable(settings.explorerCommands, index, index + 1);
								await this.saveSettings();
								this.plugin.explorerManager?.reorder();
								this.render(container);
								// Restore scroll position after render with multiple attempts
								requestAnimationFrame(() => {
									scrollContainer.scrollTop = scrollPos;
									// Also try after a short delay in case DOM isn't ready
									setTimeout(() => {
										scrollContainer.scrollTop = scrollPos;
										// One more attempt after a longer delay
										setTimeout(() => {
											scrollContainer.scrollTop = scrollPos;
										}, 50);
									}, 0);
								});
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
						const newColor = value === '#000000' ? undefined : value;
						pair.color = newColor;
						
						// Update icon preview color in real-time
						const iconButton = container.querySelector(`[data-explorer-command-id="${pair.id}"]`) as HTMLElement;
						if (iconButton) {
							if (newColor && newColor !== '#000000') {
								setCssProps(iconButton, { color: newColor });
							} else {
								iconButton.style.removeProperty('color');
							}
						}
						
						// Update reset button visibility without full re-render
						const controlEl = setting.controlEl;
						const existingReset = controlEl.querySelector('.ui-tweaker-color-reset');
						if (newColor && !existingReset) {
							// Add reset button
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
						} else if (!newColor && existingReset) {
							// Remove reset button
							existingReset.remove();
						}
						
						// Save and reorder (no full re-render to prevent flickering)
						void (async () => {
							await this.saveSettings();
							this.plugin.explorerManager?.reorder();
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
