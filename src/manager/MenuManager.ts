import { Menu, MenuItem } from 'obsidian';

/**
 * Intercepts context menus to add custom items.
 * Uses a Proxy on Menu.prototype.showAtPosition to catch menus as they open.
 */
export default class MenuManager {
    private menu: Menu | null = null;
    private queuedActions: (() => void)[] = [];
    private showAtPositionOriginal: typeof Menu.prototype.showAtPosition;
    private showAtPositionProxy: typeof Menu.prototype.showAtPosition;

    constructor() {
        const manager = this;

        // Store original method
        this.showAtPositionOriginal = Menu.prototype.showAtPosition;

        // Catch menus as they open
        // We use a proxy to intercept the call to showAtPosition
        this.showAtPositionProxy = new Proxy(Menu.prototype.showAtPosition, {
            apply(target, thisArg: Menu, argArray: any[]) {
                manager.menu = thisArg;
                if (manager.queuedActions.length > 0) {
                    manager.runQueuedActions();
                }
                return target.apply(thisArg, argArray);
            }
        });

        // Replace original method
        Menu.prototype.showAtPosition = this.showAtPositionProxy;
    }

    /**
     * Run all actions in the queue on the current menu.
     */
    private runQueuedActions(): void {
        const actions = this.queuedActions;
        this.queuedActions = [];
        for (const action of actions) {
            action();
        }
    }

    /**
     * Add a menu item to the current menu (or queue it if no menu is open).
     */
    public addItem(callback: (item: MenuItem) => void): this {
        if (this.menu) {
            this.menu.addItem(callback);
        } else {
            this.queuedActions.push(() => this.addItem(callback));
        }
        return this;
    }

    /**
     * Add a menu item after the given sections.
     * This uses private API to reorder sections.
     */
    public addItemAfter(preSections: string | string[], callback: (item: MenuItem) => void): this {
        if (this.menu) {
            if (typeof preSections === 'string') preSections = [preSections];

            this.menu.addItem((item: MenuItem) => {
                callback(item);

                // Section management (Private API)
                const menu = this.menu as any;
                const itemInternal = item as any;

                if (!menu || !itemInternal.section) return;

                const sections: string[] = menu.sections || [];
                const currentSection = itemInternal.section;

                let index = 0;
                for (const preSection of preSections) {
                    const pos = sections.lastIndexOf(preSection);
                    if (pos !== -1) {
                        index = pos + 1;
                        break;
                    }
                }

                // Move the section to the desired position
                const sectionIdx = sections.indexOf(currentSection);
                if (sectionIdx !== -1) {
                    sections.splice(sectionIdx, 1);
                    sections.splice(index, 0, currentSection);
                }
            });
        } else {
            this.queuedActions.push(() => this.addItemAfter(preSections, callback));
        }
        return this;
    }

    /**
     * Clear the queue.
     */
    public flush(): void {
        this.queuedActions = [];
    }

    /**
     * Reset for a new cycle.
     */
    public reset(): void {
        this.menu = null;
        this.flush();
    }

    /**
     * Restore original method.
     */
    public unload(): void {
        if (Menu.prototype.showAtPosition === this.showAtPositionProxy) {
            Menu.prototype.showAtPosition = this.showAtPositionOriginal;
        }
    }
}
