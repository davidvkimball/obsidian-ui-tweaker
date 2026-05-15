/**
 * Properties Manager - Injects custom icons and colors into property views
 */

import { setIcon, WorkspaceLeaf } from 'obsidian';
import UITweakerPlugin from '../main';
import { setCssProps } from '../utils/cssUtils';
import { IconPickerModal } from '../modals/IconPickerModal';

/**
 * Shape of the private Obsidian APIs we touch. None of these are in the
 * public obsidian.d.ts; declared here as `*Like` so the no-unsafe-* rules
 * don't fire at every access site.
 */
interface MetadataTypeManagerLike {
    getAssignedType?: (propName: string) => string | undefined;
    properties?: Record<string, { type?: string }>;
    types?: Record<string, string>;
}

interface AppWithMetadataTypeManager {
    metadataTypeManager?: MetadataTypeManagerLike;
}

interface ViewWithRefresh {
    refresh?: () => void;
    metadataEditor?: { render?: () => void };
}

export class PropertiesManager {
    private plugin: UITweakerPlugin;
    private observers: MutationObserver[] = [];

    constructor(plugin: UITweakerPlugin) {
        this.plugin = plugin;
        this.init();
    }

    private init(): void {
        this.plugin.app.workspace.onLayoutReady(() => {
            this.refresh();
            this.setupObservers();

            // Handle layout changes
            this.plugin.registerEvent(
                this.plugin.app.workspace.on('layout-change', () => {
                    this.refresh();
                    this.setupObservers();
                })
            );

            // Handle context menu via capture on window
            this.plugin.registerDomEvent(window, 'contextmenu', (evt: MouseEvent) => {
                if (!this.plugin.settings.showPropertyMenuActions) return;

                const target = evt.target as HTMLElement;
                const propEl = target.closest('.metadata-property') || target.closest('.all-properties-container .tree-item');

                if (propEl) {
                    this.handleContextMenu(evt, propEl as HTMLElement);
                }
            }, { capture: true });

            // Register cleanup
            this.plugin.register(() => {
                this.observers.forEach(o => o.disconnect());
            });
        });
    }

    /**
     * Force a refresh of all property icons
     */
    public refresh(): void {
        this.plugin.app.workspace.iterateAllLeaves(leaf => {
            const type = leaf.getViewState().type;
            if (type === 'markdown' || type === 'all-properties' || type === 'file-properties') {
                this.refreshLeaf(leaf);
            }
        });
    }

    private refreshLeaf(leaf: WorkspaceLeaf): void {
        const type = leaf.getViewState().type;
        const container = leaf.view.containerEl;

        if (type === 'all-properties') {
            this.refreshAllPropertiesInContainer(container);
        } else {
            // markdown or file-properties
            this.refreshFilePropertiesInContainer(container);
        }
    }

    private setupObservers(): void {
        this.observers.forEach(o => o.disconnect());
        this.observers = [];

        this.plugin.app.workspace.iterateAllLeaves(leaf => {
            const type = leaf.getViewState().type;
            if (type === 'all-properties') {
                const container = leaf.view.containerEl.querySelector('.all-properties-container') || leaf.view.containerEl.querySelector('.view-content > div');
                if (container) {
                    const observer = new MutationObserver(() => this.refreshAllPropertiesInContainer(leaf.view.containerEl));
                    observer.observe(container, { childList: true, subtree: true });
                    this.observers.push(observer);
                }
            } else if (type === 'markdown' || type === 'file-properties') {
                const container = leaf.view.containerEl.querySelector('.metadata-container') || leaf.view.containerEl.querySelector('.metadata-properties');
                if (container) {
                    const observer = new MutationObserver(() => this.refreshFilePropertiesInContainer(leaf.view.containerEl));
                    observer.observe(container, { childList: true, subtree: true });
                    this.observers.push(observer);
                }
            }
        });
    }

    private refreshAllPropertiesInContainer(container: HTMLElement): void {
        const items = container.querySelectorAll('.tree-item');
        items.forEach(item => {
            const textEl = item.querySelector('.tree-item-inner-text');
            if (!textEl) return;

            const propName = textEl.textContent?.trim();
            if (!propName) return;

            // Search case-insensitively
            const setting = this.plugin.settings.propertyIconItems.find(i => i.id.toLowerCase() === propName.toLowerCase());
            const iconEl = item.querySelector('.tree-item-icon');

            if (iconEl) {
                if (setting?.icon) {
                    this.applyIcon(iconEl as HTMLElement, setting.icon, setting.color);
                    item.addClass('ui-tweaker-property-custom-icon');
                } else if (item.hasClass('ui-tweaker-property-custom-icon')) {
                    this.restoreNativeIcon(iconEl as HTMLElement, propName);
                    item.removeClass('ui-tweaker-property-custom-icon');
                    // Trigger refresh to let Obsidian take over
                    this.triggerViewUpdate(container);
                }
            }
        });
    }

    private refreshFilePropertiesInContainer(container: HTMLElement): void {
        const props = container.querySelectorAll('.metadata-property');
        props.forEach(prop => {
            // Try to get property name from input or text
            const keyInput = prop.querySelector('.metadata-property-key-input') as HTMLInputElement;
            const keyText = prop.querySelector('.metadata-property-key-text');
            const propName = (keyInput?.value || keyText?.textContent)?.trim();

            if (!propName) return;

            // Search case-insensitively
            const setting = this.plugin.settings.propertyIconItems.find(i => i.id.toLowerCase() === propName.toLowerCase());
            const iconContainer = prop.querySelector('.metadata-property-icon');

            if (iconContainer) {
                if (setting?.icon) {
                    this.applyIcon(iconContainer as HTMLElement, setting.icon, setting.color);
                    prop.addClass('ui-tweaker-property-custom-icon');
                } else if (prop.hasClass('ui-tweaker-property-custom-icon')) {
                    this.restoreNativeIcon(iconContainer as HTMLElement, propName);
                    prop.removeClass('ui-tweaker-property-custom-icon');
                    // Trigger refresh to let Obsidian take over
                    this.triggerViewUpdate(container);
                }

                // Apply minimal mode correctly
                if (this.plugin.settings.minimalPropertyIcons) {
                    prop.addClass('ui-tweaker-property-minimal');
                } else {
                    prop.removeClass('ui-tweaker-property-minimal');
                }
            }
        });
    }

    private restoreNativeIcon(el: HTMLElement, propName: string): void {
        el.style.removeProperty('color');
        el.removeAttribute('data-ui-tweaker-applied-icon');
        el.removeAttribute('data-ui-tweaker-applied-color');

        // Try to read from our saved attribute
        const savedIcon = el.getAttribute('data-ui-tweaker-native-icon');
        if (savedIcon) {
            setIcon(el, savedIcon);
            el.removeAttribute('data-ui-tweaker-native-icon');
            return;
        }

        // Fallback to type detection if we don't have it saved
        const type = this.getPropertyType(propName);
        setIcon(el, this.getDefaultIcon(propName, type));
    }

    private getPropertyType(propName: string): string {
        const typeManager = (this.plugin.app as unknown as AppWithMetadataTypeManager).metadataTypeManager;
        const lowerName = propName.toLowerCase();

        // Hardcoded overrides for common native properties
        if (lowerName === 'tags') return 'multiselect';
        if (lowerName === 'aliases') return 'multiselect';

        if (typeManager) {
            // Check if there is an assigned type first
            if (typeManager.getAssignedType) {
                const type = typeManager.getAssignedType(propName);
                if (type) return type;
            }

            const props = typeManager.properties ?? {};
            // Try to find exact match or case-insensitive match
            const key = Object.keys(props).find(k => k.toLowerCase() === lowerName);
            if (key) return props[key].type ?? 'text';

            // Check types map directly
            const types = typeManager.types;
            if (types && types[propName]) {
                return types[propName];
            }
        }
        return 'text';
    }

    private getDefaultIcon(propName: string, type: string): string {
        const lowerName = propName.toLowerCase();

        // Special named properties always take precedence
        if (lowerName === 'tags') return 'tags';
        if (lowerName === 'aliases') return 'forward';

        switch (type) {
            case 'text': return 'text-align-start';
            case 'number': return 'binary';
            case 'checkbox':
            case 'boolean': return 'square-check-big';
            case 'date': return 'calendar';
            case 'datetime': return 'clock';
            case 'list': return 'list';
            case 'multiselect': return 'list';
            default: return 'text-align-start';
        }
    }

    private handleContextMenu(_evt: MouseEvent, propEl: HTMLElement): void {
        const keyInput = propEl.querySelector('.metadata-property-key-input') as HTMLInputElement;
        const keyText = propEl.querySelector('.tree-item-inner-text') || propEl.querySelector('.metadata-property-key-text');
        const propName = (keyInput?.value || keyText?.textContent)?.trim();

        if (!propName) return;

        // Search case-insensitively
        const normalizedPropName = propName.toLowerCase();
        const setting = this.plugin.settings.propertyIconItems.find(i => i.id.toLowerCase() === normalizedPropName);

        // Reset the menu manager for a new cycle
        this.plugin.menuManager.reset();

        // Queue our items to be added to the next menu that opens (the native Obsidian one)
        this.plugin.menuManager.addItemAfter(['action.changeType', 'action'], item => {
            item.setTitle(setting?.icon ? 'Change icon' : 'Add icon')
                .setIcon('lucide-image-plus')
                .onClick(() => {
                    const modal = new IconPickerModal(this.plugin.app, (iconId) => {
                        // The modal callback is `(iconId) => void`; do the async
                        // save work in a fire-and-forget IIFE so we don't return
                        // a Promise where void is expected.
                        void (async () => {
                            let currentItem = this.plugin.settings.propertyIconItems.find(i => i.id.toLowerCase() === normalizedPropName);
                            if (!currentItem) {
                                currentItem = { id: normalizedPropName };
                                this.plugin.settings.propertyIconItems.push(currentItem);
                            }
                            currentItem.icon = iconId || undefined;

                            // Cleanup if empty
                            if (!currentItem.icon && !currentItem.color) {
                                this.plugin.settings.propertyIconItems = this.plugin.settings.propertyIconItems.filter(i => i.id.toLowerCase() !== normalizedPropName);
                            }

                            await this.plugin.saveSettings();
                            this.refresh();
                        })();
                    });
                    modal.open();
                });
        });

        if (setting?.icon) {
            this.plugin.menuManager.addItemAfter(['action.changeType', 'action'], item => {
                item.setTitle('Remove icon')
                    .setIcon('lucide-trash')
                    .onClick(async () => {
                        const currentItem = this.plugin.settings.propertyIconItems.find(i => i.id.toLowerCase() === normalizedPropName);
                        if (currentItem) {
                            currentItem.icon = undefined;
                            if (!currentItem.color) {
                                this.plugin.settings.propertyIconItems = this.plugin.settings.propertyIconItems.filter(i => i.id.toLowerCase() !== normalizedPropName);
                            }
                            await this.plugin.saveSettings();
                            this.refresh();
                        }
                    });
            });
        }
    }

    private triggerViewUpdate(container: HTMLElement): void {
        this.plugin.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.view.containerEl.contains(container)) {
                const view = leaf.view as unknown as ViewWithRefresh;
                if (leaf.getViewState().type === 'all-properties' && view.refresh) {
                    view.refresh();
                } else {
                    const metadataEditor = view.metadataEditor;
                    if (metadataEditor?.render) {
                        metadataEditor.render();
                    }
                }
            }
        });
    }

    private applyIcon(el: HTMLElement, icon: string, color?: string): void {
        const isLucide = icon.startsWith('lucide-') || icon.match(/^[a-z0-9-]+$/);
        const targetColor = color || '';

        // Check if we need to do anything. If Obsidian overwrote it, the SVG inside won't have our tag.
        let needsUpdate = false;

        const appliedIcon = el.getAttribute('data-ui-tweaker-applied-icon');
        const appliedColor = el.getAttribute('data-ui-tweaker-applied-color') || '';

        if (appliedIcon !== icon || appliedColor !== targetColor) {
            needsUpdate = true;
        } else {
            if (isLucide) {
                const svg = el.querySelector('svg');
                if (!svg || !svg.hasAttribute('data-ui-tweaker-custom-icon')) {
                    needsUpdate = true; // Obsidian overwrote it
                }
            } else {
                if (!el.classList.contains('ui-tweaker-emoji-icon') || el.textContent !== icon) {
                    needsUpdate = true; // Obsidian overwrote it
                }
            }
        }

        if (!needsUpdate) return;

        // Save the native icon BEFORE we overwrite it, if not already saved
        if (!el.hasAttribute('data-ui-tweaker-native-icon')) {
            const svg = el.querySelector('svg');
            if (svg) {
                // Look for lucide- classes
                const lucideClass = Array.from(svg.classList).find(c => c.startsWith('lucide-') && c !== 'lucide-icon');
                if (lucideClass) {
                    const nativeName = lucideClass.replace('lucide-', '');
                    el.setAttribute('data-ui-tweaker-native-icon', nativeName);
                }
            }
        }

        if (isLucide) {
            el.empty();
            setIcon(el, icon);
            el.removeClass('ui-tweaker-emoji-icon');
            const newSvg = el.querySelector('svg');
            if (newSvg) {
                newSvg.setAttribute('data-ui-tweaker-custom-icon', 'true');
            }
        } else {
            el.empty();
            el.textContent = icon;
            el.addClass('ui-tweaker-emoji-icon');
        }

        if (color) {
            setCssProps(el, { color: color });
        } else {
            el.style.removeProperty('color');
        }

        el.setAttribute('data-ui-tweaker-applied-icon', icon);
        el.setAttribute('data-ui-tweaker-applied-color', targetColor);
    }
}
