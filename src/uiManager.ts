/**
 * UI Manager - handles CSS class injection and reveal-on-hover functionality
 */

import { UISettings } from './settings';
import { UIVisibilityState } from './types';

export class UIManager {
	private settings: UISettings;
	private revealListeners: Map<string, () => void> = new Map();

	constructor(settings: UISettings) {
		this.settings = settings;
	}

	updateSettings(settings: UISettings) {
		this.settings = settings;
		this.applyStyles();
	}

	applyStyles() {
		const body = document.body;

		// Auto-hide elements with Show/Hide/Reveal
		this.applyVisibilityState(body, 'auto-hide-title-bar', this.settings.titleBar, true);
		this.applyVisibilityState(body, 'auto-hide-file-explorer-nav-header', this.settings.fileExplorerNavHeader);
		this.applyVisibilityState(body, 'auto-hide-other-nav-headers', this.settings.otherNavHeaders);
		this.applyVisibilityState(body, 'auto-hide-left-tab-headers', this.settings.leftTabHeaders);
		this.applyVisibilityState(body, 'auto-hide-right-tab-headers', this.settings.rightTabHeaders);
		this.applyVisibilityState(body, 'auto-hide-vault-switcher', this.settings.vaultSwitcher);
		this.applyVisibilityState(body, 'hider-help-button', this.settings.helpButton);
		this.applyVisibilityState(body, 'auto-hide-settings-button', this.settings.settingsButton);

		// Ribbon - boolean toggle (auto-collapse-ribbon)
		body.classList.toggle('auto-collapse-ribbon', this.settings.ribbonRevealOnHover);

		// Simple toggles
		body.classList.toggle('hider-tabs', this.settings.tabBar);
		body.classList.toggle('hide-button-new-note', this.settings.newNoteButton);
		body.classList.toggle('hide-button-new-folder', this.settings.newFolderButton);
		body.classList.toggle('hide-button-sort-order', this.settings.sortOrderButton);
		body.classList.toggle('hide-button-auto-reveal', this.settings.autoRevealButton);
		body.classList.toggle('hide-button-collapse-all', this.settings.collapseAllButton);
		body.classList.toggle('hide-button-reading-mode', this.settings.readingModeButton);
		body.classList.toggle('hide-button-search-settings', this.settings.searchSettingsButton);
		
		// Tab icons - now support Reveal
		this.applyVisibilityState(body, 'hide-tab-list-icon', this.settings.tabListIcon);
		this.applyVisibilityState(body, 'hide-new-tab-icon', this.settings.newTabIcon);
		this.applyVisibilityState(body, 'hide-tab-close-button', this.settings.tabCloseButton);
		
		body.classList.toggle('hider-status', this.settings.statusBar);
		body.classList.toggle('hider-scroll', this.settings.scrollBars);
		
		// Sidebar toggle buttons - now support Reveal
		this.applyVisibilityState(body, 'hider-left-sidebar-button', this.settings.leftSidebarToggleButton);
		this.applyVisibilityState(body, 'hider-right-sidebar-button', this.settings.rightSidebarToggleButton);
		
		body.classList.toggle('hider-tooltips', this.settings.tooltips);
		body.classList.toggle('hider-search-suggestions', this.settings.searchSuggestions);
		body.classList.toggle('hider-search-counts', this.settings.searchTermCounts);
		body.classList.toggle('hider-meta', this.settings.propertiesInReadingView);
		body.classList.toggle('metadata-heading-off', this.settings.propertiesInHeading);
		body.classList.toggle('metadata-add-property-off', this.settings.addPropertyButton);
		body.classList.toggle('hider-instructions', this.settings.instructions);

		// Mobile-specific
		body.classList.toggle('hide-icon-mobile-chevrons', this.settings.mobileChevronsIcon);
		body.classList.toggle('hide-button-mobile-navbar-action-back', this.settings.navigateBackButton);
		body.classList.toggle('hide-button-mobile-navbar-action-forward', this.settings.navigateForwardButton);
		body.classList.toggle('hide-button-mobile-navbar-action-quick-switcher', this.settings.quickSwitcherButton);
		body.classList.toggle('hide-button-mobile-navbar-action-new-tab', this.settings.mobileNewTabButton);
		body.classList.toggle('hide-button-mobile-navbar-action-tabs', this.settings.openTabButton);
		body.classList.toggle('hide-button-mobile-navbar-action-menu', this.settings.ribbonMenuButton);
		body.classList.toggle('swap-mobile-new-tab-icon', this.settings.swapMobileNewTabIcon);

		// Mobile navigation menu positions
		// Remove all existing order classes first
		const orderClasses = Array.from(body.classList).filter((cls) =>
			cls.startsWith('order-navbar-button-nth-child-')
		);
		orderClasses.forEach((cls) => body.classList.remove(cls));

		// Add the selected order classes
		body.classList.add(`order-navbar-button-nth-child-1-${this.settings.navigateButtonPosition}`);
		body.classList.add(`order-navbar-button-nth-child-2-${this.settings.navigationButtonPosition}`);
		body.classList.add(`order-navbar-button-nth-child-3-${this.settings.quickSwitcherPosition}`);
		body.classList.add(`order-navbar-button-nth-child-4-${this.settings.newTabPosition}`);
		body.classList.add(`order-navbar-button-nth-child-5-${this.settings.openTabsPosition}`);
		body.classList.add(`order-navbar-button-nth-child-6-${this.settings.ribbonMenuPosition}`);

		// Vault switcher background transparency
		// Note: CSS custom properties (variables) require direct style manipulation
		// as they are dynamic values that cannot be set via CSS classes
		body.style.setProperty('--auto-hide-vault-switcher-bg-transparency', String(this.settings.vaultSwitcherBackgroundTransparency));
		
		// Set mask based on transparency
		if (this.settings.vaultSwitcherBackgroundTransparency >= 1) {
			body.style.setProperty('--auto-hide-vault-switcher-mask', 'none');
		} else {
			body.style.setProperty('--auto-hide-vault-switcher-mask', 
				'linear-gradient(to top, hsl(0, 0%, 0%) 0%, hsla(0, 0%, 0%, 0.99) 18.4%, hsla(0, 0%, 0%, 0.963) 33.7%, hsla(0, 0%, 0%, 0.92) 46.4%, hsla(0, 0%, 0%, 0.864) 56.7%, hsla(0, 0%, 0%, 0.796) 64.8%, hsla(0, 0%, 0%, 0.72) 71.2%, hsla(0, 0%, 0%, 0.637) 76.1%, hsla(0, 0%, 0%, 0.55) 79.9%, hsla(0, 0%, 0%, 0.46) 82.8%, hsla(0, 0%, 0%, 0.37) 85.2%, hsla(0, 0%, 0%, 0.283) 87.3%, hsla(0, 0%, 0%, 0.2) 89.6%, hsla(0, 0%, 0%, 0.124) 92.3%, hsla(0, 0%, 0%, 0.056) 95.6%, hsla(0, 0%, 0%, 0) 100%)');
		}
	}

	private applyVisibilityState(body: HTMLElement, className: string, state: UIVisibilityState, useAlwaysShow: boolean = false) {
		// Remove all states first
		if (useAlwaysShow) {
			body.classList.remove('always-show-title-bar', `${className}-hide`, `${className}-reveal`);
		} else {
			body.classList.remove(`${className}-show`, `${className}-hide`, `${className}-reveal`);
		}

		// Apply the current state
		if (state === 'show') {
			if (useAlwaysShow) {
				body.classList.add('always-show-title-bar');
			}
			// No class needed for show state (or use always-show for title bar)
		} else if (state === 'hide') {
			body.classList.add(`${className}-hide`);
		} else if (state === 'reveal') {
			body.classList.add(`${className}-reveal`);
		}
	}

	cleanup() {
		// Remove all event listeners
		this.revealListeners.forEach((cleanup) => cleanup());
		this.revealListeners.clear();

		// Remove all classes
		const body = document.body;
		const classesToRemove: string[] = [];
		body.classList.forEach((className) => {
			if (className.startsWith('ui-tweaker-') || 
			    className.startsWith('auto-hide-') ||
			    className.startsWith('hider-') ||
			    className.startsWith('hide-') ||
			    className.startsWith('metadata-') ||
			    className.startsWith('order-navbar-button-') ||
			    className === 'auto-collapse-ribbon' ||
			    className === 'swap-mobile-new-tab-icon' ||
			    className === 'always-show-title-bar') {
				classesToRemove.push(className);
			}
		});
		classesToRemove.forEach((className) => body.classList.remove(className));

		// Remove CSS variables
		body.style.removeProperty('--auto-hide-vault-switcher-bg-transparency');
		body.style.removeProperty('--auto-hide-vault-switcher-mask');
	}
}
