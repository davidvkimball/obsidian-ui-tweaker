/**
 * Base class for all settings tabs
 */

import { App, Setting } from 'obsidian';
import UITweakerPlugin from '../../main';
import { UISettings } from '../../settings';

export abstract class TabRenderer {
	protected app: App;
	protected plugin: UITweakerPlugin;

	constructor(app: App, plugin: UITweakerPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	abstract render(container: HTMLElement): void | Promise<void>;

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
				dropdown.onChange(async (value) => {
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
				toggle.onChange(async (value) => {
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
					.onChange(async (value) => {
						onChange(value);
						await this.saveSettings();
					});
				return slider;
			});
	}

}
