/**
 * Base class for all settings tabs
 */

import { App, Setting } from 'obsidian';
import UITweakerPlugin from '../../main';
import { UISettings, DEFAULT_SETTINGS } from '../../settings';

export abstract class TabRenderer {
	protected app: App;
	protected plugin: UITweakerPlugin;
	// The element the list is rendered into (declarative sub-page mode), so a
	// split-out reset button can re-render just the list.
	protected listContainer?: HTMLElement;
	// Whether render() draws its own reset button. False in declarative sub-page
	// mode, where the reset is a separate page item. Persists across the tab's
	// internal re-renders so row edits don't re-introduce an inline reset.
	protected includeResetButton = true;

	constructor(app: App, plugin: UITweakerPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	abstract render(container: HTMLElement, includeReset?: boolean): void | Promise<void>;

	/**
	 * Renders the "Reset to default" affordance into its own host (used by the
	 * declarative sub-pages so the reset is a distinct page item rather than
	 * embedded at the top of the list). On click it restores the given keys to
	 * their defaults, runs the optional side effect, persists, and re-renders the
	 * list host — which, in this mode, no longer draws its own reset button.
	 */
	renderResetButtonSeparate(resetHost: HTMLElement, keys: (keyof UISettings)[], onReset?: () => void | Promise<void>): void {
		const resetContainer = resetHost.createDiv('ui-tweaker-reset-container');

		const setting = new Setting(resetContainer);
		setting.setClass('ui-tweaker-reset-setting');
		setting.setName('Reset to default');

		setting.addExtraButton(button => {
			button.setIcon('rotate-ccw')
				.setTooltip('Reset tab to defaults')
				.onClick(async () => {
					const settingsBag = this.plugin.settings as unknown as Record<string, unknown>;
					keys.forEach(key => {
						settingsBag[key] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[key])) as unknown;
					});

					if (onReset) {
						await onReset();
					}

					await this.saveSettings();
					if (this.listContainer) {
						await this.render(this.listContainer);
					}
				});
		});
	}

	protected getSettings(): UISettings {
		return this.plugin.settings;
	}

	protected async saveSettings(): Promise<void> {
		await this.plugin.saveSettings();
		this.plugin.refresh();
	}

	protected createDropdownSetting(
		container: HTMLElement,
		name: string,
		description: string,
		value: string,
		options: Record<string, string>,
		onChange: (value: string) => void
	): Setting {
		return new Setting(container)
			.setName(name)
			.setDesc(description)
			.addDropdown(dropdown => {
				Object.entries(options).forEach(([key, label]) => {
					dropdown.addOption(key, label);
				});
				dropdown.setValue(value);
				dropdown.onChange(async value => {
					onChange(value);
					await this.saveSettings();
				});
				return dropdown;
			});
	}

	protected createToggleSetting(
		container: HTMLElement,
		name: string,
		description: string,
		value: boolean,
		onChange: (value: boolean) => void
	): Setting {
		return new Setting(container)
			.setName(name)
			.setDesc(description)
			.addToggle(toggle => {
				toggle.setValue(value);
				toggle.onChange(async value => {
					onChange(value);
					await this.saveSettings();
				});
				return toggle;
			});
	}

	protected createSliderSetting(
		container: HTMLElement,
		name: string,
		description: string,
		value: number,
		min: number,
		max: number,
		step: number,
		onChange: (value: number) => void
	): Setting {
		return new Setting(container)
			.setName(name)
			.setDesc(description)
			.addSlider(slider => {
				slider
					.setLimits(min, max, step)
					.setValue(value)
					.setDynamicTooltip()
					.onChange(async value => {
						onChange(value);
						await this.saveSettings();
					});
				return slider;
			});
	}

	/**
	 * Renders a "Reset to defaults" button at the top of the tab
	 */
	protected renderResetButton(container: HTMLElement, keys: (keyof UISettings)[], onReset?: () => void | Promise<void>): void {
		const resetContainer = container.createDiv('ui-tweaker-reset-container');

		const setting = new Setting(resetContainer);
		setting.setClass('ui-tweaker-reset-setting');
		setting.setName('Reset to default');

		setting.addExtraButton(button => {
			button.setIcon('rotate-ccw')
				.setTooltip('Reset tab to defaults')
				.onClick(async () => {
					// Indexing UISettings with dynamic keys: writing to
					// `settings[key]` where `key` is `keyof UISettings`
					// resolves to `never` in strict mode. Treat the
					// settings bag as a string-keyed record for the
					// dynamic assignment — the runtime shape is correct
					// by construction (each key reads its own default).
					const settingsBag = this.plugin.settings as unknown as Record<string, unknown>;
					keys.forEach(key => {
						settingsBag[key] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[key])) as unknown;
					});

					if (onReset) {
						await onReset();
					}

					await this.saveSettings();
					// Full re-render of this tab
					await this.render(container);
				});
		});
	}
}
