/**
 * Settings interface and defaults
 */

import { UIVisibilityState, MobileNavPosition, CommandIconPair, StatusBarItem, ExplorerButtonItem } from './types';

export interface UISettings {
	// Auto-hide elements (Show/Hide/Reveal)
	titleBar: UIVisibilityState;
	fileExplorerNavHeader: UIVisibilityState;
	otherNavHeaders: UIVisibilityState;
	leftTabHeaders: UIVisibilityState;
	rightTabHeaders: UIVisibilityState;
	ribbonRevealOnHover: boolean; // Boolean toggle for auto-collapse ribbon
	vaultSwitcher: UIVisibilityState;
	helpButton: UIVisibilityState; // Changed to support Show/Hide/Reveal
	settingsButton: UIVisibilityState;

	// Simple toggles (Show/Hide only)
	tabBar: boolean;
	tabBarHideWhenSingle: boolean;
	enableWindowDragging: boolean;
	newNoteButton: boolean;
	newFolderButton: boolean;
	sortOrderButton: boolean;
	autoRevealButton: boolean;
	collapseAllButton: boolean;
	readingModeButton: boolean;
	searchSettingsButton: boolean;
	tabListIcon: UIVisibilityState; // Changed to support Reveal
	newTabIcon: UIVisibilityState; // Changed to support Reveal
	tabCloseButton: UIVisibilityState; // Changed to support Reveal
	statusBar: boolean;
	scrollBars: UIVisibilityState; // Changed to support Reveal
	leftSidebarToggleButton: UIVisibilityState; // Changed to support Reveal
	rightSidebarToggleButton: UIVisibilityState; // Changed to support Reveal
	tooltips: boolean;
	searchSuggestions: boolean;
	searchTermCounts: boolean;
	propertiesInReadingView: boolean;
	propertiesInHeading: boolean;
	addPropertyButton: boolean;
	deemphasizeProperties: boolean;
	instructions: boolean;

	// Mobile-specific settings (Show/Hide only)
	mobileChevronsIcon: boolean;
	navigateBackButton: boolean;
	navigateForwardButton: boolean;
	quickSwitcherButton: boolean;
	mobileNewTabButton: boolean;
	openTabButton: boolean;
	ribbonMenuButton: boolean;
	swapMobileNewTabIcon: boolean;
	hideMobileTitle: boolean;
	hideMobileSyncIcon: boolean;

	// Mobile navigation menu positions
	navigateButtonPosition: MobileNavPosition;
	navigationButtonPosition: MobileNavPosition;
	quickSwitcherPosition: MobileNavPosition;
	newTabPosition: MobileNavPosition;
	openTabsPosition: MobileNavPosition;
	ribbonMenuPosition: MobileNavPosition;

	// Advanced settings
	vaultSwitcherBackgroundTransparency: number; // 0-1
	helpButtonReplacement: {
		enabled: boolean;
		commandId: string;
		iconId: string;
	};
	syncButtonReplacement: {
		enabled: boolean;
		commandId: string;
		iconId: string;
	};

	// Tab Bar custom commands
	tabBarCommands: CommandIconPair[];

	// Status Bar items (unified list of existing + custom)
	statusBarItems: StatusBarItem[];

	// Explorer custom commands (legacy - kept for migration)
	explorerCommands: CommandIconPair[];

	// Explorer button items (unified list of native + external + custom)
	explorerButtonItems: ExplorerButtonItem[];

	// Native explorer button colors (optional)
	nativeExplorerButtonColors?: {
		newNote?: string;
		newFolder?: string;
		sortOrder?: string;
		autoReveal?: string;
		collapseAll?: string;
	};

	// Native explorer button icon overrides (optional)
	nativeExplorerButtonIcons?: {
		newNote?: string;
		newFolder?: string;
		sortOrder?: string;
		autoReveal?: string;
		collapseAll?: string;
	};
}

export const DEFAULT_SETTINGS: UISettings = {
	// Auto-hide elements
	titleBar: 'show',
	fileExplorerNavHeader: 'show',
	otherNavHeaders: 'show',
	leftTabHeaders: 'show',
	rightTabHeaders: 'show',
	ribbonRevealOnHover: false,
	vaultSwitcher: 'show',
	helpButton: 'show',
	settingsButton: 'show',

	// Simple toggles
	tabBar: false,
	tabBarHideWhenSingle: false,
	enableWindowDragging: false,
	newNoteButton: false,
	newFolderButton: false,
	sortOrderButton: false,
	autoRevealButton: false,
	collapseAllButton: false,
	readingModeButton: false,
	searchSettingsButton: false,
	tabListIcon: 'show',
	newTabIcon: 'show',
	tabCloseButton: 'show',
	statusBar: false,
	scrollBars: 'show',
	leftSidebarToggleButton: 'show',
	rightSidebarToggleButton: 'show',
	tooltips: false,
	searchSuggestions: false,
	searchTermCounts: false,
	propertiesInReadingView: false,
	propertiesInHeading: false,
	addPropertyButton: false,
	deemphasizeProperties: false,
	instructions: false,

	// Mobile-specific
	mobileChevronsIcon: false,
	navigateBackButton: false,
	navigateForwardButton: false,
	quickSwitcherButton: false,
	mobileNewTabButton: false,
	openTabButton: false,
	ribbonMenuButton: false,
	swapMobileNewTabIcon: false,
	hideMobileTitle: false,
	hideMobileSyncIcon: false,

	// Mobile navigation menu positions
	navigateButtonPosition: '1',
	navigationButtonPosition: '2',
	quickSwitcherPosition: '3',
	newTabPosition: '4',
	openTabsPosition: '5',
	ribbonMenuPosition: '6',

	// Advanced
	vaultSwitcherBackgroundTransparency: 0.98,
	helpButtonReplacement: {
		enabled: false,
		commandId: '',
		iconId: 'wrench',
	},
	syncButtonReplacement: {
		enabled: false,
		commandId: '',
		iconId: 'wrench',
	},

	// Tab Bar
	tabBarCommands: [],

	// Status Bar
	statusBarItems: [],

	// Explorer
	explorerCommands: [],
	explorerButtonItems: [],

	// Native explorer button colors
	nativeExplorerButtonColors: {
		newNote: undefined,
		newFolder: undefined,
		sortOrder: undefined,
		autoReveal: undefined,
		collapseAll: undefined,
	},

	// Native explorer button icon overrides
	nativeExplorerButtonIcons: {
		newNote: undefined,
		newFolder: undefined,
		sortOrder: undefined,
		autoReveal: undefined,
		collapseAll: undefined,
	},
};
