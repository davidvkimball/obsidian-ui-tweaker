import { Menu, MenuItem } from 'obsidian';

/**
 * Shape of the private parts of Obsidian's `Menu` / `MenuItem` we touch
 * for section reordering. Not in the public API; declared here so the
 * unsafe-any rules don't fire at every access site.
 */
interface MenuWithSections {
    sections?: string[];
}

interface MenuItemWithSection {
    section?: string;
}

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
        // We're intentionally reading the unbound prototype method so we can
        // restore it later and wrap it through a Proxy. The Proxy's `apply`
        // trap below re-applies the original with the correct Menu instance
        // as `thisArg`, so there's no actual unbound-method risk here.
        // eslint-disable-next-line @typescript-eslint/unbound-method -- See comment above; Proxy.apply re-binds `this` per call.
        const originalShowAtPosition = Menu.prototype.showAtPosition;
        this.showAtPositionOriginal = originalShowAtPosition;

        // Catch menus as they open via a Proxy on showAtPosition. Arrow
        // function inside the proxy handler keeps `this` bound to the manager
        // without the `const manager = this` alias the lint rule rejects.
        this.showAtPositionProxy = new Proxy(originalShowAtPosition, {
            apply: (target, thisArg: Menu, argArray: unknown[]): void => {
                this.menu = thisArg;
                if (this.queuedActions.length > 0) {
                    this.runQueuedActions();
                }
                (target as (this: Menu, ...args: unknown[]) => void).apply(thisArg, argArray);
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

                // Section management (private Obsidian API)
                const menu = this.menu as unknown as MenuWithSections | null;
                const itemInternal = item as unknown as MenuItemWithSection;
                const currentSection = itemInternal.section;

                if (!menu || !currentSection) return;

                const sections: string[] = menu.sections ?? [];

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
