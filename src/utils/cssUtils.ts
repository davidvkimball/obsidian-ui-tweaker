/**
 * Utility functions for CSS generation
 */

/**
 * Calculates the mask-image value for the vault switcher based on transparency
 */
export function getVaultSwitcherMask(transparency: number): string {
    if (transparency >= 1) {
        return 'none';
    }
    return 'linear-gradient(to top, hsl(0, 0%, 0%) 0%, hsla(0, 0%, 0%, 0.99) 18.4%, hsla(0, 0%, 0%, 0.963) 33.7%, hsla(0, 0%, 0%, 0.92) 46.4%, hsla(0, 0%, 0%, 0.864) 56.7%, hsla(0, 0%, 0%, 0.796) 64.8%, hsla(0, 0%, 0%, 0.72) 71.2%, hsla(0, 0%, 0%, 0.637) 76.1%, hsla(0, 0%, 0%, 0.55) 79.9%, hsla(0, 0%, 0%, 0.46) 82.8%, hsla(0, 0%, 0%, 0.37) 85.2%, hsla(0, 0%, 0%, 0.283) 87.3%, hsla(0, 0%, 0%, 0.2) 89.6%, hsla(0, 0%, 0%, 0.124) 92.3%, hsla(0, 0%, 0%, 0.056) 95.6%, hsla(0, 0%, 0%, 0) 100%)';
}

/**
 * Lightweight helper that mirrors Obsidian's setCssProps API where unavailable
 */
export function setCssProps(el: HTMLElement, props: Record<string, string | number>) {
    Object.entries(props).forEach(([key, value]) => {
        el.style.setProperty(key, String(value));
    });
}
