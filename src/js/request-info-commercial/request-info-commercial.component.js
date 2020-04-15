import { Component } from 'rxcomp';
import { FormControl, FormGroup, Validators } from 'rxcomp-form';
import { takeUntil } from 'rxjs/operators';
import HttpService from '../http/http.service';

/*
Mail
La mail di recap presenterà i dati inseriti dall’utente e come oggetto “Richiesta Informazioni commerciali”

Generazione Mail
•	Romania > tiemmesystems@tiemme.com
•	Spagna > tiemmesistemas@tiemme.com
•	Grecia > customerservice.gr@tiemme.com
•	Albania, Kosovo, Serbia, Montenegro, Bulgaria > infobalkans@tiemme.com
•	Tutti gli altri > info@tiemme.com
*/

export default class RequestInfoCommercialComponent extends Component {

	onInit() {
		const data = window.data || {
			roles: [],
			interests: [],
			countries: [],
			provinces: []
		};

		const form = new FormGroup({
			firstName: new FormControl(null, Validators.RequiredValidator()),
			lastName: new FormControl(null, Validators.RequiredValidator()),
			email: new FormControl(null, [Validators.RequiredValidator(), Validators.EmailValidator()]),
			company: new FormControl(null, Validators.RequiredValidator()),
			role: new FormControl(null, Validators.RequiredValidator()),
			interests: new FormControl(null, Validators.RequiredValidator()),
			country: new FormControl(null, Validators.RequiredValidator()),
			province: new FormControl(null, Validators.RequiredValidator()),
			message: null,
			privacy: new FormControl(null, Validators.RequiredTrueValidator()),
			newsletter: null,
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
			// console.log('RequestInfoCommercialComponent.form.changes$', changes, form.valid);
			this.countryId = changes.country;
			this.pushChanges();
		});

		this.data = data;
		this.form = form;
		this.error = null;
		this.success = false;
	}

	set countryId(countryId) {
		if (this.countryId_ !== countryId) {
			// console.log('RequestInfoCommercialComponent.set countryId', countryId);
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

	onSubmit(from) {
		// console.log('RequestInfoCommercialComponent.onSubmit', 'form.valid', valid);
		if (this.form.valid) {
			// console.log('RequestInfoCommercialComponent.onSubmit', this.form.value);
			this.form.submitted = true;
			// HttpService.post$('/WS/wsUsers.asmx/Contact', { data: this.form.value })
			HttpService.post$('/api/users/Contact', this.form.value)
				.subscribe(response => {
					console.log('RequestInfoCommercialComponent.onSubmit', response);
					this.success = true;
					this.form.reset();
					// this.pushChanges();
					dataLayer.push({
						'event': 'formSubmission',
						'form type': (null == from ? 'Contatti Tiemme' : from)
					});

				}, error => {
					console.log('RequestInfoCommercialComponent.error', error);
					this.error = error;
					this.pushChanges();
				});
		} else {
			this.form.touched = true;
		}
	}

}

RequestInfoCommercialComponent.meta = {
	selector: '[request-info-commercial]',
};
