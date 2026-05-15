import { App, PluginSettingTab, ButtonComponent } from 'obsidian';
import UITweakerPlugin from '../main';
import { TabRenderer } from './common/TabRenderer';
import { HiderTab } from './tabs/HiderTab';
import { TabBarTab } from './tabs/TabBarTab';
import { StatusBarTab } from './tabs/StatusBarTab';
import { ExplorerTab } from './tabs/ExplorerTab';
import { MobileTab } from './tabs/MobileTab';
import { PropertiesTab } from './tabs/PropertiesTab';

type TabId = 'hider' | 'status-bar' | 'tab-bar' | 'explorer' | 'properties' | 'mobile';

interface TabDefinition {
	id: TabId;
	name: string;
	renderer: TabRenderer;
}

export class UITweakerSettingTab extends PluginSettingTab {
	plugin: UITweakerPlugin;
	public icon = 'lucide-wrench';
	public id = 'ui-tweaker';

	private tabContentMap: Map<TabId, HTMLElement> = new Map();
	private tabButtons: Map<TabId, ButtonComponent> = new Map();
	private activeTabId: TabId | null = null;

	constructor(app: App, plugin: UITweakerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('ui-tweaker-settings-tab-root');

		// Tag the surrounding `.vertical-tab-content` / `.vertical-tab-container`
		// elements so styles.css can target them without `:has()`. We clean
		// these up in `hide()` so the markers don't outlive our tab.
		const tabContent = containerEl.closest('.vertical-tab-content');
		if (tabContent) tabContent.classList.add('ui-tweaker-settings-tab-host');
		const tabContainer = containerEl.closest('.vertical-tab-container');
		if (tabContainer) tabContainer.classList.add('ui-tweaker-settings-tab-host');

		this.tabContentMap.clear();
		this.tabButtons.clear();

		const tabs: TabDefinition[] = [
			{ id: 'hider', name: 'Hider', renderer: new HiderTab(this.app, this.plugin) },
			{ id: 'status-bar', name: 'Status bar', renderer: new StatusBarTab(this.app, this.plugin) },
			{ id: 'tab-bar', name: 'Tab bar', renderer: new TabBarTab(this.app, this.plugin) },
			{ id: 'explorer', name: 'Explorer', renderer: new ExplorerTab(this.app, this.plugin) },
			{ id: 'properties', name: 'Properties', renderer: new PropertiesTab(this.app, this.plugin) },
			{ id: 'mobile', name: 'Mobile', renderer: new MobileTab(this.app, this.plugin) }
		];

		const tabsWrapper = containerEl.createDiv('ui-tweaker-settings-tabs');
		const navEl = tabsWrapper.createDiv('ui-tweaker-settings-tabs-nav');
		navEl.setAttribute('role', 'tablist');
		const contentWrapper = tabsWrapper.createDiv('ui-tweaker-settings-tabs-content');

		tabs.forEach(tab => {
			const buttonComponent = new ButtonComponent(navEl);
			buttonComponent.setButtonText(tab.name);
			buttonComponent.removeCta();
			buttonComponent.buttonEl.addClass('ui-tweaker-settings-tab-button');
			buttonComponent.buttonEl.addClass('clickable-icon');
			buttonComponent.buttonEl.setAttribute('role', 'tab');
			buttonComponent.buttonEl.setAttribute('aria-selected', 'false');
			buttonComponent.onClick(() => {
				void this.activateTab(tab.id, tabs, contentWrapper);
			});
			this.tabButtons.set(tab.id, buttonComponent);
		});

		// Activate initial tab
		const initialTabId = this.activeTabId && tabs.some(t => t.id === this.activeTabId)
			? this.activeTabId
			: tabs[0].id;

		void this.activateTab(initialTabId, tabs, contentWrapper);
	}

	private async activateTab(
		id: TabId,
		tabs: TabDefinition[],
		contentWrapper: HTMLElement
	): Promise<void> {
		const definition = tabs.find(tab => tab.id === id);
		if (!definition) return;

		// Lazy load tab content
		if (!this.tabContentMap.has(id)) {
			const tabContainer = contentWrapper.createDiv('ui-tweaker-settings-tab');
			await definition.renderer.render(tabContainer);
			this.tabContentMap.set(id, tabContainer);
		}

		// Deactivate previous tab
		if (this.activeTabId && this.activeTabId !== id) {
			const prevContent = this.tabContentMap.get(this.activeTabId);
			if (prevContent) prevContent.removeClass('is-active');

			const prevButton = this.tabButtons.get(this.activeTabId);
			if (prevButton) {
				prevButton.buttonEl.removeClass('is-active');
				prevButton.buttonEl.setAttribute('aria-selected', 'false');
				prevButton.removeCta();
			}
		}

		// Activate new tab
		const newContent = this.tabContentMap.get(id);
		if (newContent) newContent.addClass('is-active');

		const newButton = this.tabButtons.get(id);
		if (newButton) {
			newButton.buttonEl.addClass('is-active');
			newButton.buttonEl.setAttribute('aria-selected', 'true');
			newButton.setCta();
		}

		this.activeTabId = id;
		contentWrapper.scrollTop = 0;
	}

	hide(): void {
		// Strip the marker classes we added in `display()`. Without this,
		// switching to another plugin's settings tab would leave Obsidian's
		// `.vertical-tab-content` styled as if our settings were still open.
		const hosts = activeDocument.querySelectorAll('.ui-tweaker-settings-tab-host');
		hosts.forEach((el) => el.classList.remove('ui-tweaker-settings-tab-host'));
	}
}
