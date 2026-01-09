/**
 * Utility functions for command management
 */

import { Command, MarkdownView, WorkspaceLeaf } from 'obsidian';
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
 */
class CommandToggleTracker {
	private toggleStates = new Map<string, boolean>();
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
	 * Reset tracked state for a command
	 */
	resetState(id: string): void {
		this.toggleStates.delete(id);
		this.executionCounts.delete(id);
	}

	/**
	 * Sync tracked state with actual command state
	 * Used when checkCallback reports a different state than tracked
	 */
	syncState(id: string, actualState: boolean): void {
		const currentTrackedState = this.toggleStates.get(id);
		if (currentTrackedState !== actualState) {
			// State changed - update tracked state to match
			// Adjust execution count to reflect the change
			const currentCount = this.executionCounts.get(id) || 0;
			this.executionCounts.set(id, currentCount + 1);
			this.toggleStates.set(id, actualState);
		}
	}
}

// Global tracker instance
const commandToggleTracker = new CommandToggleTracker();

/**
 * Check if a command is currently checked/toggled on
 * First tries checkCallback if available, otherwise uses tracked state
 */
export function isCommandChecked(id: string, plugin: UITweakerPlugin): boolean {
	const command = getCommandFromId(id, plugin);
	if (!command) {
		// Fallback to tracked state if command not found
		return commandToggleTracker.getTrackedState(id) ?? false;
	}
	
	// Check if command has a checkCallback (preferred method)
	if (typeof command.checkCallback === 'function') {
		try {
			// Call checkCallback with checking=true to see if it returns true (checked state)
			// Note: checkCallback should return true if checked, false if unchecked
			const result = command.checkCallback(true);
			const isChecked = result === true;
			
			// Sync tracked state with checkCallback result to keep them in sync
			// This helps when commands are executed externally (keyboard shortcuts, etc.)
			commandToggleTracker.syncState(id, isChecked);
			
			// Always trust checkCallback over tracked state when available
			return isChecked;
		} catch (error) {
			// If checkCallback throws, fall back to tracked state
			console.debug('[UI Tweaker] checkCallback error for', id, error);
			return commandToggleTracker.getTrackedState(id) ?? false;
		}
	}
	
	// No checkCallback - use tracked state
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