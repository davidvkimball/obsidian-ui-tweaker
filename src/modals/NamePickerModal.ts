/**
 * Name Picker Modal
 * Simple modal for entering a custom name
 */

import { App, Modal, TextComponent } from 'obsidian';

export class NamePickerModal extends Modal {
	private onSubmit: (name: string) => void;
	private defaultName: string;

	constructor(app: App, defaultName: string, onSubmit: (name: string) => void) {
		super(app);
		this.defaultName = defaultName;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Enter name' });

		const inputContainer = contentEl.createDiv();
		const input = new TextComponent(inputContainer);
		input.setValue(this.defaultName);
		input.setPlaceholder('Enter custom name...');
		input.inputEl.addClass('ui-tweaker-name-input');
		input.inputEl.select();

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		const submitButton = buttonContainer.createEl('button', { text: 'OK', cls: 'mod-cta' });
		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });

		const handleSubmit = (): void => {
			const value = input.getValue().trim();
			if (value) {
				this.onSubmit(value);
				this.close();
			}
		};

		submitButton.addEventListener('click', handleSubmit);
		cancelButton.addEventListener('click', () => this.close());
		input.inputEl.addEventListener('keydown', (evt) => {
			if (evt.key === 'Enter') {
				evt.preventDefault();
				handleSubmit();
			}
			if (evt.key === 'Escape') {
				evt.preventDefault();
				this.close();
			}
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
