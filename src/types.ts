/**
 * Type definitions for UI Tweaker plugin
 */

export type UIVisibilityState = 'show' | 'hide' | 'reveal';

export type MobileNavPosition = '1' | '2' | '3' | '4' | '5' | '6';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type Mode = 'desktop' | 'any' | 'mobile' | string; // string = "this device" (app.appId)

export interface CommandIconPair {
	id: string;
	icon: string;
	name: string; // User-set display name
	displayName: string; // Original command display name (for reference)
	mode: Mode;
	color?: string;
	mdOnly?: boolean; // Only show on markdown/markdownx files
	toggleIcon?: string; // Icon to show when command is toggled on
	useActiveClass?: boolean; // For explorer only: use is-active class instead of icon swap
}

export interface StatusBarItem {
	id: string; // Unique identifier (for custom commands: `custom-${commandId}`, for existing items: generated ID like `plugin-name;1`)
	name: string; // Display name (editable for custom items)
	displayName?: string; // Original command display name (for custom items)
	icon?: string; // Icon ID (for custom items)
	type: 'custom' | 'existing'; // 'custom' = user-added command, 'existing' = detected from status bar
	hidden?: boolean; // Whether to hide this item
	mdOnly?: boolean; // Only show on markdown/markdownx files
	commandId?: string; // For custom items: the command ID to execute
	color?: string; // Custom color for icon (for custom items)
	mode?: Mode; // Device mode (for custom items)
	sticky?: 'left' | 'right' | false; // Stick item to far left or far right of status bar
}
