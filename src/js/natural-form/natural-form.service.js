import { BehaviorSubject } from 'rxjs';
import { STATIC } from '../environment/environment';

export default class NaturalFormService {

	static get values() {
		const values = {};
		const form = this.form;
		const phrase = this.phrase;
		Object.keys(this.form).forEach(key => {
			if (phrase.indexOf(`$${key}$`) !== -1) {
				values[key] = form[key].value;
			}
		});
		return values;
	}

	static set form(form) {
		this.form$.next(form);
	}

	static get form() {
		return this.form$.getValue();
	}

	static get phrase() {
		const form = this.form;
		// console.log('NaturalFormService.set phrase form', form);
		let action = form.action.options.find(x => x.id === form.action.value);
		if (!action) {
			action = form.action.options[0];
		}
		return action.phrase;
	}

	static get title() {
		let phrase = this.phrase;
		const form = this.form;
		Object.keys(form).forEach(key => {
			let label;
			const filter = this.form[key];
			let value = filter.value;
			const items = filter.options || [];
			if (filter.multiple) {
				value = value || [];
				if (value.length) {
					label = value.map(v => {
						const item = items.find(x => x.id === v || x.name === v);
						return item ? item.name : '';
					}).join(', ');
				} else {
					label = items.length ? '...' : filter.label;
				}
			} else {
				const item = items.find(x => x.id === value || x.name === value);
				if (item) {
					label = item.name;
				} else {
					label = items.length ? '...' : filter.label;
				}
			}
			phrase = phrase.replace(`$${key}$`, label);
		});
		return phrase;
	}

	static get clubProfileUrl() {
		return this.form.club.profileUrl;
	}

	static get clubModalUrl() {
		return STATIC ? '/agora/club-modal.html' : this.form.club.modalUrl;
	}

	static next(form) {
		this.form = form || this.form; // setter & getter
	}

	static getDefaultValue() {
		const form = window.naturalForm || {};
		Object.keys(form).forEach(key => {
			const filter = form[key];
			switch (key) {
				case 'club':
				case 'newsletter':
					break;
				default:
					const firstId = filter.options[0].id;
					filter.value = filter.multiple ? [firstId] : firstId;
			}
		});
		return form;
	}

	static get disabled() {
		return false; // !!! return false until getDefaultValue set initial value
		let disabled = false;
		const values = this.values;
		Object.keys(values).forEach(key => {
			switch (key) {
				case 'club':
				case 'newsletter':
					break;
				default:
					disabled = disabled || values[key] == undefined;
			}
		});
		return disabled;
	}

}

NaturalFormService.form$ = new BehaviorSubject(NaturalFormService.getDefaultValue()); // !!! static
