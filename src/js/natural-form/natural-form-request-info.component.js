import { Component } from 'rxcomp';
import { FormControl, FormGroup, Validators } from 'rxcomp-form';
import { takeUntil } from 'rxjs/operators';
import HttpService from '../http/http.service';
import NaturalFormService from './natural-form.service';

export default class NaturalFormRequestInfoComponent extends Component {

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
			country: new FormControl(null, Validators.RequiredValidator()),
			province: new FormControl(null, Validators.RequiredValidator()),
			message: null,
			privacy: new FormControl(null, Validators.RequiredTrueValidator()),
			newsletter: values.newsletter === 2 ? true : false,
			scope: 'www.website.com',
			checkRequest: window.antiforgery,
			checkField: '',
		});

		const controls = form.controls;
		controls.role.options = data.roles;
		controls.interests.options = data.interests;
		controls.country.options = data.countries;
		controls.province.options = [];
		this.controls = controls;

		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			// console.log('NaturalFormRequestInfoComponent.form.changes$', changes, form.valid);
			this.countryId = changes.country;
			this.pushChanges();
		});

		this.data = data;
		this.form = form;
		this.error = null;
		this.success = false;
	}

	onChanges(changes) {}

	set countryId(countryId) {
		if (this.countryId_ !== countryId) {
			// console.log('NaturalFormRequestInfoComponent.set countryId', countryId);
			this.countryId_ = countryId;
			const provinces = this.data.provinces.filter(province => {
				return String(province.idstato) === String(countryId);
			});
			this.controls.province.options = provinces;
			this.controls.province.hidden = provinces.length === 0;
			if (!provinces.find(x => x.id === this.controls.province.value)) {
				this.controls.province.value = null;
			}
		}
	}

	test() {
		this.form.patch({
			firstName: 'Jhon',
			lastName: 'Appleseed',
			email: 'jhonappleseed@gmail.com',
			company: 'Websolute',
			role: this.controls.role.options[0].id,
			interests: this.controls.interests.options[0].id,
			country: this.controls.country.options[0].id,
			privacy: true,
			checkRequest: window.antiforgery,
			checkField: ''
		});
	}

	reset() {
		this.form.reset();
	}

	onSubmit() {
		// console.log('NaturalFormRequestInfoComponent.onSubmit', 'form.valid', valid);
		if (this.form.valid) {
			// console.log('NaturalFormRequestInfoComponent.onSubmit', this.form.value);
			this.form.submitted = true;
			//HttpService.post$('/WS/wsUsers.asmx/Contact', { data: this.form.value })
			HttpService.post$('/api/users/RequestInfo', this.form.value)
				.subscribe(response => {
					console.log('NaturalFormRequestInfoComponent.onSubmit', response);
					this.form.reset();
					this.success = true;
					dataLayer.push({
						'event': 'formSubmission',
						'form type': 'Contatti Tiemme'
					});
				}, error => {
					console.log('NaturalFormRequestInfoComponent.error', error);
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

NaturalFormRequestInfoComponent.meta = {
	selector: '[natural-form-request-info]',
	outputs: ['back'],
};
