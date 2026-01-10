/**
 * Main Settings Tab with tab navigation
 */

import { App, PluginSettingTab, Platform } from 'obsidian';
import UITweakerPlugin from '../main';
import { TabRenderer } from './common/TabRenderer';
import { HiderTab } from './tabs/HiderTab';
import { TabBarTab } from './tabs/TabBarTab';
import { StatusBarTab } from './tabs/StatusBarTab';
import { ExplorerTab } from './tabs/ExplorerTab';
import { MobileTab } from './tabs/MobileTab';

export class UITweakerSettingTab extends PluginSettingTab {
	plugin: UITweakerPlugin;

	constructor(app: App, plugin: UITweakerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.render();
	}

	render(): void {
		const { containerEl } = this;
		containerEl.empty();

		// On mobile, simplify: just show the Mobile tab directly (no tab navigation)
		// This avoids CSS conflicts with Obsidian's app.css and provides a cleaner experience
		// DON'T add ui-tweaker-settings class on mobile - let it use native Obsidian styling
		if (Platform.isMobile || document.body.classList.contains('is-mobile')) {
			const mobileTab = new MobileTab(this.app, this.plugin);
			void mobileTab.render(containerEl);
			return;
		}

		// Desktop: Add the class for tab navigation styling
		containerEl.addClass('ui-tweaker-settings');

		// Desktop: Use tab navigation
		const tabContainer = containerEl.createDiv('tab-container');
		const tabNav = tabContainer.createDiv('tab-nav');
		const tabContent = tabContainer.createDiv('tab-content');

		// Tab definitions
		const tabs: Array<{ id: string; name: string; renderer: TabRenderer }> = [
			{
				id: 'hider',
				name: 'Hider',
				renderer: new HiderTab(this.app, this.plugin)
			},
			{
				id: 'status-bar',
				name: 'Status bar',
				renderer: new StatusBarTab(this.app, this.plugin)
			},
			{
				id: 'tab-bar',
				name: 'Tab bar',
				renderer: new TabBarTab(this.app, this.plugin)
			},
			{
				id: 'explorer',
				name: 'Explorer',
				renderer: new ExplorerTab(this.app, this.plugin)
			},
			{
				id: 'mobile',
				name: 'Mobile',
				renderer: new MobileTab(this.app, this.plugin)
			}
		];

		// Create tab buttons with clean styling
		tabs.forEach((tab, index) => {
			const button = tabNav.createEl('button', {
				text: tab.name,
				cls: `tab-button ${index === 0 ? 'active' : ''}`
			});
			
			button.addEventListener('click', () => {
				// Remove active class from all buttons
				tabNav.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
				// Add active class to clicked button
				button.classList.add('active');
				// Render tab content immediately
				tabContent.empty();
				void tab.renderer.render(tabContent);
			});
		});

		// Render the first tab by default
		void tabs[0].renderer.render(tabContent);
	}
}
