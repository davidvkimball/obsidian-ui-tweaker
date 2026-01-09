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
