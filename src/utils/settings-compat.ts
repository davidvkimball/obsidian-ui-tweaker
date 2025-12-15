/**
 * Compatibility utilities for settings
 * Provides backward compatibility for SettingGroup (requires API 1.11.0+)
 */

import { Setting, SettingGroup, requireApiVersion } from 'obsidian';

/**
 * Interface that works with both SettingGroup and fallback container
 */
export interface SettingsContainer {
	addSetting(cb: (setting: Setting) => void): void;
}

/**
 * Creates a settings container that uses SettingGroup if available (API 1.11.0+),
 * otherwise falls back to creating a heading and using the container directly.
 * 
 * Uses requireApiVersion('1.11.0') to check if SettingGroup is available.
 * This is the official Obsidian API method for version checking.
 * 
 * @param containerEl - The container element for settings
 * @param heading - The heading text for the settings group (optional)
 * @returns A container that can be used to add settings
 */
export function createSettingsGroup(
	containerEl: HTMLElement,
	heading?: string
): SettingsContainer {
	// Check if SettingGroup is available (API 1.11.0+)
	// requireApiVersion is the official Obsidian API method for version checking
	if (requireApiVersion('1.11.0')) {
		// Use SettingGroup - it's guaranteed to exist if requireApiVersion returns true
		const group = heading 
			? new SettingGroup(containerEl).setHeading(heading)
			: new SettingGroup(containerEl);
		return {
			addSetting(cb: (setting: Setting) => void) {
				group.addSetting(cb);
			}
		};
	} else {
		// Fallback: Create a heading manually for older API versions
		// Note: While best practice prefers Setting.setHeading(), the fallback path
		// is for versions that may not support it, so manual heading is appropriate here
		if (heading) {
			const headingEl = containerEl.createDiv('setting-group-heading');
			headingEl.createEl('h3', { text: heading });
		}
		
		return {
			addSetting(cb: (setting: Setting) => void) {
				const setting = new Setting(containerEl);
				cb(setting);
			}
		};
	}
}

