/**
 * Properties Tab - Custom icons and colors for properties
 */

import { setIcon, ColorComponent, Setting, SettingGroup } from 'obsidian';
import { TabRenderer } from '../common/TabRenderer';
import { IconPickerModal } from '../../modals/IconPickerModal';
import { setCssProps } from '../../utils/cssUtils';

/**
 * Minimal shape of Obsidian's private metadataTypeManager.properties map,
 * used here just to enumerate known properties.
 */
interface AppWithMetadataTypeManager {
    metadataTypeManager?: {
        properties?: Record<string, unknown>;
    };
}


export class PropertiesTab extends TabRenderer {
    private container?: HTMLElement;

    render(container: HTMLElement): void {
        this.container = container;
        container.empty();
        const settings = this.getSettings();

        this.renderResetButton(container, ['propertyIconItems', 'minimalPropertyIcons', 'showPropertyMenuActions']);

        // Ensure propertyIconItems exists
        if (!settings.propertyIconItems) {
            settings.propertyIconItems = [];
        }

        // General Settings
        const topGroup = new SettingGroup(container);
        topGroup.addSetting(setting => {
            setting
                .setName('Minimal property icons')
                .setDesc('Hide the default property type icon and only show your custom icon.')
                .addToggle(toggle => {
                    toggle.setValue(settings.minimalPropertyIcons)
                        .onChange(async value => {
                            settings.minimalPropertyIcons = value;
                            await this.saveSettings();
                            this.plugin.propertiesManager?.refresh();
                        });
                });
        });

        topGroup.addSetting(setting => {
            setting
                .setName('Right-click menu')
                .setDesc('Add icon and remove-icon actions to the property context menu.')
                .addToggle(toggle => {
                    toggle.setValue(settings.showPropertyMenuActions)
                        .onChange(async value => {
                            settings.showPropertyMenuActions = value;
                            await this.saveSettings();
                        });
                });
        });

        const propGroup = new SettingGroup(container).setHeading('Property Icons');

        // Get all properties currently defined or in use
        const metadataProps = Object.keys(
            (this.app as unknown as AppWithMetadataTypeManager).metadataTypeManager?.properties ?? {}
        );
        const savedProps = settings.propertyIconItems.map(i => i.id);

        // Normalize all to lowercase for the unique set, but we'll display them as stored if possible
        // However, to avoid duplicates in the list, we'll just lowercase everything here
        const allProperties = Array.from(new Set([...metadataProps, ...savedProps].map(p => p.toLowerCase()))).sort();

        if (allProperties.length === 0) {
            container.createDiv('ui-tweaker-empty-state', el => {
                el.createEl('p', { text: 'No properties found in your vault yet.' });
                el.createEl('p', { text: 'Add some properties to your notes to see them here.', cls: 'sub-text' });
            });
            return;
        }

        allProperties.forEach((propName) => {
            this.renderPropertySetting(propGroup, propName);
        });
    }

    private renderPropertySetting(group: SettingGroup, propName: string): void {
        const settings = this.getSettings();
        const normalizedPropName = propName.toLowerCase();
        const item = settings.propertyIconItems.find(i => i.id.toLowerCase() === normalizedPropName);

        group.addSetting((setting: Setting) => {
            setting.setName(propName);

            // Reset button (only show if icon or color is set)
            if (item?.icon || item?.color) {
                setting.addExtraButton((button) => {
                    button.setIcon('lucide-rotate-ccw')
                        .setTooltip('Reset to default')
                        .onClick(async () => {
                            settings.propertyIconItems = settings.propertyIconItems.filter(i => i.id.toLowerCase() !== normalizedPropName);
                            await this.saveSettings();
                            if (this.container) this.render(this.container);
                            this.plugin.propertiesManager?.refresh();
                        });
                });
            }

            // Icon display/picker
            setting.addExtraButton((button) => {
                button.extraSettingsEl.addClass('ui-tweaker-property-icon-btn');
                const iconEl = button.extraSettingsEl;
                if (item?.icon) {
                    setIcon(iconEl, item.icon);
                    if (item.color) {
                        setCssProps(iconEl, { color: item.color });
                    }
                } else {
                    setIcon(iconEl, 'lucide-plus-circle');
                    setCssProps(iconEl, { opacity: '0.4' });
                }

                button.setTooltip(item?.icon ? `Icon: ${item.icon} (click to change)` : 'Add icon');
                button.onClick(() => {
                    const modal = new IconPickerModal(this.app, (iconId) => {
                        // Modal callback is `(iconId) => void`; do the async save
                        // work in a fire-and-forget IIFE so we don't return a
                        // Promise where void is expected.
                        void (async () => {
                            let currentItem = settings.propertyIconItems.find(i => i.id.toLowerCase() === normalizedPropName);
                            if (!currentItem) {
                                currentItem = { id: normalizedPropName };
                                settings.propertyIconItems.push(currentItem);
                            }

                            if (iconId) {
                                currentItem.icon = iconId;
                            } else {
                                currentItem.icon = undefined;
                            }

                            // Cleanup if empty
                            if (!currentItem.icon && !currentItem.color) {
                                settings.propertyIconItems = settings.propertyIconItems.filter(i => i.id.toLowerCase() !== normalizedPropName);
                            }

                            await this.saveSettings();
                            if (this.container) this.render(this.container);
                            this.plugin.propertiesManager?.refresh();
                        })();
                    });
                    modal.open();
                });
            });

            // Color picker (only show if icon is set)
            if (item?.icon) {
                const colorPicker = new ColorComponent(setting.controlEl);
                colorPicker.setValue(item.color || '#000000');
                colorPicker.onChange(async value => {
                    const currentItem = settings.propertyIconItems.find(i => i.id.toLowerCase() === normalizedPropName);
                    if (!currentItem) return;
                    currentItem.color = value === '#000000' ? undefined : value;
                    await this.saveSettings();

                    // Update preview color in real-time
                    const iconBtn = setting.settingEl.querySelector('.ui-tweaker-property-icon-btn') as HTMLElement;
                    if (iconBtn) {
                        if (currentItem.color) {
                            setCssProps(iconBtn, { color: currentItem.color });
                        } else {
                            iconBtn.style.removeProperty('color');
                        }
                    }

                    this.plugin.propertiesManager?.refresh();
                });
            }
        });
    }
}
