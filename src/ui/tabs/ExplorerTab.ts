/**
 * Explorer Tab - Unified list of existing + custom explorer buttons
 * TODO: Implement based on Commander's ExplorerManager + Explorer Focus
 */

import { TabRenderer } from '../common/TabRenderer';

export class ExplorerTab extends TabRenderer {
	render(container: HTMLElement): void {
		container.createDiv({ text: 'Explorer settings - Coming soon' });
	}
}
