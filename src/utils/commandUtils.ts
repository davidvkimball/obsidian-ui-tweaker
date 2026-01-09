/**
 * Utility functions for command management
 */

import { Command, MarkdownView, WorkspaceLeaf, TFile } from 'obsidian';
import UITweakerPlugin from '../main';
import { Mode } from '../types';

/**
 * Check if a view is a markdown or markdownx file
 */
export function isMarkdownView(leaf: WorkspaceLeaf | null): boolean {
	if (!leaf?.view) return false;
	
	if (leaf.view instanceof MarkdownView) {
		const file = leaf.view.file;
		if (!file) return false;
		
		// Check if file extension is .md or .mdx
		const ext = file.extension.toLowerCase();
		return ext === 'md' || ext === 'mdx';
	}
	
	return false;
}

/**
 * Get file extension from a workspace leaf
 */
function getFileExtension(leaf: WorkspaceLeaf | null): string | null {
	if (!leaf?.view) return null;
	
	// Try to get file from view (works for ItemView and MarkdownView)
	const view = leaf.view as { file?: TFile | null };
	const file = view.file;
	if (!file) return null;
	
	return file.extension.toLowerCase();
}

/**
 * Parse comma-separated file extensions into an array
 */
function parseFileTypes(types: string | undefined): string[] {
	if (!types || !types.trim()) return [];
	return types
		.split(',')
		.map(p => p.trim().replace(/^\./, '').toLowerCase())
		.filter(p => p);
}

/**
 * Check if a file matches the file type filters
 * showOnFileTypes: Show only on these file types (e.g., "md,mdx")
 * hideOnFileTypes: Never show on these file types (e.g., "jpg,png")
 */
export function matchesFileTypeFilter(
	leaf: WorkspaceLeaf | null,
	showOnFileTypes: string | undefined,
	hideOnFileTypes: string | undefined
): boolean {
	// Get file extension from leaf
	const fileExt = getFileExtension(leaf);
	if (!fileExt) return false; // No file = don't show
	
	// Parse the filter strings
	const showTypes = parseFileTypes(showOnFileTypes);
	const hideTypes = parseFileTypes(hideOnFileTypes);
	
	// If hide list exists and file matches, don't show
	if (hideTypes.length > 0 && hideTypes.includes(fileExt)) {
		return false;
	}
	
	// If show list exists, must match one of them
	if (showTypes.length > 0) {
		return showTypes.includes(fileExt);
	}
	
	// No filters = show on all files (unless hidden)
	return true;
}

/**
 * Check if mode is active (desktop/mobile/any/this device)
 */
export function isModeActive(mode: Mode, plugin: UITweakerPlugin): boolean {
	const app = plugin.app as { isMobile?: boolean; appId?: string };
	const isMobile = app.isMobile ?? false;
	const appId = app.appId;
	
	// Handle "this device" mode (app.appId)
	if (mode !== 'any' && mode !== 'desktop' && mode !== 'mobile') {
		return mode === appId;
	}
	
	return (
		mode === 'any' ||
		(mode === 'mobile' && isMobile) ||
		(mode === 'desktop' && !isMobile)
	);
}

/**
 * Get command from ID
 */
export function getCommandFromId(id: string, plugin: UITweakerPlugin): Command | null {
	const commands = (plugin.app as { commands?: { commands?: { [id: string]: Command } } }).commands;
	return commands?.commands?.[id] ?? null;
}

/**
 * Command toggle state tracker
 * Tracks toggle state for commands that don't have checkCallback
 * Also tracks previous states to detect changes
 */
class CommandToggleTracker {
	private toggleStates = new Map<string, boolean>();
	private previousStates = new Map<string, boolean>();
	private executionCounts = new Map<string, number>();

	/**
	 * Record that a command was executed
	 */
	recordExecution(id: string): void {
		const currentCount = this.executionCounts.get(id) || 0;
		this.executionCounts.set(id, currentCount + 1);
		
		// Toggle state based on execution count (odd = on, even = off)
		// This is a fallback for commands without checkCallback
		this.toggleStates.set(id, (currentCount + 1) % 2 === 1);
	}

	/**
	 * Get tracked toggle state (for commands without checkCallback)
	 */
	getTrackedState(id: string): boolean | null {
		return this.toggleStates.get(id) ?? null;
	}

	/**
	 * Get previous toggle state (for change detection)
	 */
	getPreviousState(id: string): boolean | null {
		return this.previousStates.get(id) ?? null;
	}

	/**
	 * Reset tracked state for a command
	 */
	resetState(id: string): void {
		this.toggleStates.delete(id);
		this.previousStates.delete(id);
		this.executionCounts.delete(id);
	}

	/**
	 * Sync tracked state with actual command state
	 * Used when checkCallback reports a different state than tracked
	 * Returns true if state changed, false otherwise
	 */
	syncState(id: string, actualState: boolean): boolean {
		const currentTrackedState = this.toggleStates.get(id);
		
		// Store current state as previous before updating
		if (currentTrackedState !== undefined) {
			this.previousStates.set(id, currentTrackedState);
		}
		
		if (currentTrackedState !== actualState) {
			// State changed - update tracked state to match
			// Adjust execution count to reflect the change
			const currentCount = this.executionCounts.get(id) || 0;
			this.executionCounts.set(id, currentCount + 1);
			this.toggleStates.set(id, actualState);
			return true; // State changed
		}
		
		return false; // No change
	}

	/**
	 * Check if state has changed since last check
	 */
	hasStateChanged(id: string, currentState: boolean): boolean {
		const previousState = this.previousStates.get(id);
		return previousState !== undefined && previousState !== currentState;
	}
}

// Global tracker instance
const commandToggleTracker = new CommandToggleTracker();

/**
 * Check if a command is currently checked/toggled on
 * First tries checkCallback if available, otherwise uses tracked state
 * For specific commands (like theme toggle), checks actual state directly
 * 
 * This function always checks the actual state (via checkCallback or direct detection)
 * and syncs it with tracked state, ensuring buttons stay in sync even when commands
 * are executed externally (keyboard shortcuts, command palette, etc.)
 */
export function isCommandChecked(id: string, plugin: UITweakerPlugin): boolean {
	// Special handling for commands that need direct state detection
	// These commands don't have reliable checkCallback, so we check DOM/app state directly
	
	// Theme toggle - check DOM class
	if (id === 'theme:toggle-light-dark') {
		// Check theme state directly from DOM
		// Obsidian uses 'theme-dark' class on body for dark mode
		const isDark = document.body.classList.contains('theme-dark');
		// Sync tracked state with actual state
		commandToggleTracker.syncState(id, isDark);
		return isDark;
	}

	// Editing Toolbar hide/show - check plugin settings
	// The command ID is 'hide-show-menu' but it's registered under 'editing-toolbar:hide-show-menu'
	if (id === 'editing-toolbar:hide-show-menu' || id === 'hide-show-menu') {
		// Try to access the editing toolbar plugin's settings
		const plugins = (plugin.app as { plugins?: { plugins?: { [id: string]: { settings?: { cMenuVisibility?: boolean } } } } }).plugins;
		const editingToolbarPlugin = plugins?.plugins?.['editing-toolbar'];
		if (editingToolbarPlugin?.settings?.cMenuVisibility !== undefined) {
			const isVisible = editingToolbarPlugin.settings.cMenuVisibility;
			// Sync tracked state with actual state
			commandToggleTracker.syncState(id, isVisible);
			return isVisible;
		}
		// Fallback to tracked state if plugin not found
		return commandToggleTracker.getTrackedState(id) ?? false;
	}

	const command = getCommandFromId(id, plugin);
	if (!command) {
		// Command not found - fallback to tracked state
		// This can happen with custom plugin commands that haven't registered yet
		return commandToggleTracker.getTrackedState(id) ?? false;
	}
	
	// Check if command has a checkCallback (preferred method for all commands)
	if (typeof command.checkCallback === 'function') {
		try {
			// Call checkCallback with checking=true to see if it returns true (checked state)
			// Note: checkCallback should return true if checked, false if unchecked
			const result = command.checkCallback(true);
			const isChecked = result === true;
			
			// Always sync tracked state with checkCallback result
			// This ensures buttons stay in sync even when commands are executed externally
			// (keyboard shortcuts, command palette, other plugins, etc.)
			commandToggleTracker.syncState(id, isChecked);
			
			// Always trust checkCallback over tracked state when available
			return isChecked;
		} catch {
			// If checkCallback throws, fall back to tracked state
			// This can happen if the command's checkCallback has bugs or isn't ready yet
			return commandToggleTracker.getTrackedState(id) ?? false;
		}
	}
	
	// No checkCallback - use tracked state
	// This is a fallback for commands that don't provide checkCallback
	// The periodic refresh will keep trying to detect state changes
	return commandToggleTracker.getTrackedState(id) ?? false;
}

/**
 * Record that a command was executed (for toggle tracking)
 */
export function recordCommandExecution(id: string): void {
	commandToggleTracker.recordExecution(id);
}

/**
 * Reset tracked state for a command
 */
export function resetCommandState(id: string): void {
	commandToggleTracker.resetState(id);
}