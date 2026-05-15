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
 * Get view type from a workspace leaf
 * Returns the view type (e.g., "markdown", "canvas", "graph", "empty") or null
 */
function getViewType(leaf: WorkspaceLeaf | null): string | null {
	if (!leaf?.view) return null;

	// Try to get view type from view (ItemView has getViewType method)
	const view = leaf.view as { getViewType?: () => string };
	if (view.getViewType && typeof view.getViewType === 'function') {
		return view.getViewType().toLowerCase();
	}

	// Fallback: check if it's a markdown view
	if (leaf.view instanceof MarkdownView) {
		return 'markdown';
	}

	// If no file and no view type, it's likely an empty tab
	const fileExt = getFileExtension(leaf);
	if (!fileExt) {
		return 'empty'; // Empty tab (new tab)
	}

	return null;
}

import { parseFileAndViewTypes, CommandToggleTracker } from './command-logic';

/**
 * Check if a file or view matches the file type and view type filters
 * showOnFileTypes: Show only on these file types (e.g., "md,canvas") or view types for views without files (e.g., "{{graph}},{{tab}}")
 * hideOnFileTypes: Never show on these file types (e.g., "jpg,png") or view types for views without files (e.g., "{{graph}}")
 */
export function matchesFileTypeFilter(
	leaf: WorkspaceLeaf | null,
	showOnFileTypes: string | undefined,
	hideOnFileTypes: string | undefined
): boolean {
	if (!leaf?.view) return false;

	const showFilters = parseFileAndViewTypes(showOnFileTypes);
	const hideFilters = parseFileAndViewTypes(hideOnFileTypes);

	const fileExt = getFileExtension(leaf);
	const viewType = getViewType(leaf);

	if (hideFilters.fileTypes.length > 0 && fileExt && hideFilters.fileTypes.includes(fileExt)) {
		return false;
	}
	if (hideFilters.viewTypes.length > 0 && viewType && hideFilters.viewTypes.includes(viewType)) {
		return false;
	}

	if (showFilters.fileTypes.length > 0 || showFilters.viewTypes.length > 0) {
		const matchesFileType = fileExt ? showFilters.fileTypes.includes(fileExt) : false;
		const matchesViewType = viewType ? showFilters.viewTypes.includes(viewType) : false;
		return matchesFileType || matchesViewType;
	}

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
		const isDark = activeDocument.body.classList.contains('theme-dark');
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