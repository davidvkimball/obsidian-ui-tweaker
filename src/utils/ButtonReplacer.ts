import { setIcon } from 'obsidian';

export interface ButtonReplacerOptions {
    survivalObserver?: boolean;
    parentSelector?: string;
    iconSelector?: string;
    uniqueId: string;
    cssClass: string;
    onAfterInstall?: (customButton: HTMLElement, originalButton: HTMLElement | null) => void;
    onBeforeUninstall?: (customButton: HTMLElement | null) => void;
    useCapture?: boolean;
    handleTouch?: boolean;
    // Function to find the original button if selector is not enough
    findButton?: (parent: Element) => HTMLElement | null;
    stripClasses?: string[];
    fallbackParentSelector?: string;
    fallbackInsertBehavior?: 'start' | 'end';
}

export class ButtonReplacer {
    private customButton: HTMLElement | null = null;
    private originalButton: HTMLElement | null = null;
    private observer: MutationObserver | null = null;
    private installTimeout: number | null = null;

    constructor(
        private selector: string,
        private replacementIcon: string,
        private callback: () => void,
        private options: ButtonReplacerOptions
    ) { }

    install(): void {
        this.tryInstall();

        // Also try after a short delay to ensure DOM is ready
        this.installTimeout = window.setTimeout(() => this.tryInstall(), 500);

        if (this.options.survivalObserver) {
            this.setupObserver();
        }
    }

    private tryInstall(): void {
        const parent = this.options.parentSelector
            ? document.querySelector(this.options.parentSelector)
            : document.body;

        if (!parent) return;

        let originalBtn: HTMLElement | null = null;
        if (this.options.findButton) {
            originalBtn = this.options.findButton(parent);
        } else {
            originalBtn = parent.querySelector(this.selector) as HTMLElement;
        }

        if (!originalBtn) {
            if (this.options.fallbackParentSelector) {
                this.tryFallbackInstall();
            }
            return;
        }

        // Skip if already replaced and button is still valid
        if (this.customButton && this.customButton.parentElement && document.body.contains(this.customButton)) {
            return;
        }

        // Remove old custom button if it exists but is stale
        this.removeCustomButton();

        // Create replacement
        const customButton = originalBtn.cloneNode(true) as HTMLElement;
        customButton.removeAttribute('aria-label');
        customButton.setAttribute(`data-${this.options.uniqueId}`, 'true');
        if (this.options.cssClass) {
            this.options.cssClass.split(' ').filter(Boolean).forEach(cls => customButton.classList.add(cls));
        }

        // Strip classes that might affect color or state
        if (this.options.stripClasses) {
            this.options.stripClasses.forEach(cls => customButton.classList.remove(cls));
        }

        // Clear existing handlers
        customButton.onclick = null;

        // Set icon
        const iconContainer = customButton.querySelector('svg')?.parentElement || customButton;
        try {
            // Clear old svg
            const oldSvg = customButton.querySelector('svg');
            if (oldSvg) oldSvg.remove();

            setIcon(iconContainer, this.replacementIcon);
        } catch (e) {
            console.error(`[UI Tweaker] Failed to set icon ${this.replacementIcon}:`, e);
            try {
                setIcon(iconContainer, 'wrench');
            } catch {
                // Fallback failed too
            }
        }

        // Click handler
        const handler = (evt: Event) => {
            evt.preventDefault();
            evt.stopPropagation();
            this.callback();
        };

        customButton.addEventListener('click', handler, this.options.useCapture ?? true);
        if (this.options.handleTouch) {
            customButton.addEventListener('touchstart', handler, this.options.useCapture ?? true);
        }

        // Insert
        originalBtn.parentElement?.insertBefore(customButton, originalBtn);

        this.customButton = customButton;
        this.originalButton = originalBtn;

        if (this.options.onAfterInstall) {
            this.options.onAfterInstall(customButton, originalBtn);
        }
    }

    private tryFallbackInstall(): void {
        const fallbackParent = document.querySelector(this.options.fallbackParentSelector!) as HTMLElement;
        if (!fallbackParent) return;

        // Skip if already exists
        if (fallbackParent.querySelector(`[data-${this.options.uniqueId}]`)) return;

        const customButton = document.createElement('div');
        customButton.className = `clickable-icon ${this.options.cssClass}`;
        customButton.setAttribute(`data-${this.options.uniqueId}`, 'true');

        // Set icon
        try {
            setIcon(customButton, this.replacementIcon);
        } catch (e) {
            setIcon(customButton, 'wrench');
        }

        // Click handler
        const handler = (evt: Event) => {
            evt.preventDefault();
            evt.stopPropagation();
            this.callback();
        };

        customButton.addEventListener('click', handler, this.options.useCapture ?? true);
        if (this.options.handleTouch) {
            customButton.addEventListener('touchstart', handler, this.options.useCapture ?? true);
        }

        // Insert
        if (this.options.fallbackInsertBehavior === 'start') {
            fallbackParent.prepend(customButton);
        } else {
            fallbackParent.appendChild(customButton);
        }

        this.customButton = customButton;
        this.originalButton = null;

        if (this.options.onAfterInstall) {
            this.options.onAfterInstall(customButton, null);
        }
    }

    uninstall(): void {
        if (this.installTimeout) {
            clearTimeout(this.installTimeout);
            this.installTimeout = null;
        }

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.options.onBeforeUninstall) {
            this.options.onBeforeUninstall(this.customButton);
        }

        this.removeCustomButton();
        this.originalButton = null;
    }

    private removeCustomButton(): void {
        if (this.customButton) {
            if (this.customButton.parentElement) {
                this.customButton.remove();
            }
            this.customButton = null;
        }

        // Clean up any stray ones
        const strays = document.querySelectorAll(`.${this.options.cssClass}`);
        strays.forEach((el: any) => el.remove());
    }

    private setupObserver(): void {
        if (this.observer) this.observer.disconnect();

        let mutationCount = 0;
        let timer: number | null = null;

        this.observer = new MutationObserver(() => {
            mutationCount++;
            if (timer) window.clearTimeout(timer);

            // Aggressive startup mode: 0ms delay for first 20 mutations to ensure instant swap during reloads.
            // After that, use a small debounce (100ms) for ongoing stability.
            const delay = mutationCount < 20 ? 0 : 100;

            if (delay === 0) {
                this.tryInstall();
            } else {
                timer = window.setTimeout(() => this.tryInstall(), delay);
            }
        });

        // Always observe the document body for maximum reliability, even if parent selector is provided.
        // This ensures the monitor survives parent element recreation.
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'src', 'aria-label']
        });
    }
}
