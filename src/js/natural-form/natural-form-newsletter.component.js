import { Component } from 'rxcomp';
import { FormControl, FormGroup, Validators } from 'rxcomp-form';
import { takeUntil } from 'rxjs/operators';
import HttpService from '../http/http.service';
import NaturalFormService from './natural-form.service';

export default class NaturalFormNewsletterComponent extends Component {

	onInit() {
		const values = NaturalFormService.values;
		this.title = NaturalFormService.title;

		const data = window.data || {
			roles: [],
			interests: [],
			countries: [],
			provinces: []
		};

		const form = new FormGroup({
			role: new FormControl(values.role, Validators.RequiredValidator()),
			interests: new FormControl(values.interest, Validators.RequiredValidator()),
			//
			firstName: new FormControl(null, Validators.RequiredValidator()),
			lastName: new FormControl(null, Validators.RequiredValidator()),
			email: new FormControl(null, [Validators.RequiredValidator(), Validators.EmailValidator()]),
			company: new FormControl(null, Validators.RequiredValidator()),
			privacy: new FormControl(null, Validators.RequiredTrueValidator()),
			newsletter: new FormControl(true, Validators.RequiredTrueValidator()),
			checkRequest: window.antiforgery,
			checkField: '',
		});

		const controls = form.controls;
		controls.role.options = data.roles;
		controls.interests.options = data.interests;
		this.controls = controls;

		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			// console.log('NaturalFormNewsletterComponent.form.changes$', changes, form.valid);
			this.pushChanges();
		});

		this.data = data;
		this.form = form;
		this.error = null;
		this.success = false;
	}

	test() {
		this.form.patch({
			firstName: 'Jhon',
			lastName: 'Appleseed',
			email: 'jhonappleseed@gmail.com',
			company: 'Websolute',
			role: this.controls.role.options[0].id,
			interests: this.controls.interests.options[0].id,
			privacy: true,
			checkRequest: window.antiforgery,
			checkField: ''
		});
	}

	reset() {
		this.form.reset();
	}

	onSubmit() {
		// console.log('NaturalFormNewsletterComponent.onSubmit', 'form.valid', valid);
		if (this.form.valid) {
			// console.log('NaturalFormNewsletterComponent.onSubmit', this.form.value);
			this.form.submitted = true;
			//HttpService.post$('/WS/wsUsers.asmx/Newsletter', { data: this.form.value })
			HttpService.post$('/api/users/Newsletter', this.form.value)
				.subscribe(response => {
					console.log('NaturalFormNewsletterComponent.onSubmit', response);
					this.success = true;
					this.form.reset();
					// this.pushChanges();
					dataLayer.push({
						'event': 'formSubmission',
						'form type': 'Iscrizione alla Newsletter'
					});
				}, error => {
					console.log('NaturalFormNewsletterComponent.error', error);
					this.error = error;
					this.pushChanges();
				});
		} else {
			this.form.touched = true;
		}
	}

	onBack() {
		this.back.next();
	}

}

NaturalFormNewsletterComponent.meta = {
	selector: '[natural-form-newsletter]',
	outputs: ['back'],
};
