import { Component } from 'rxcomp';
import { takeUntil } from 'rxjs/operators';
import { STATIC } from '../environment/environment';
import ModalService, { ModalResolveEvent } from '../modal/modal.service';
import UserService from '../user/user.service';
import NaturalFormService from './natural-form.service';

export default class NaturalFormComponent extends Component {

	onInit() {
		this.views = {
			NATURAL: 0,
			TECHNICAL: 1,
			COMMERCIAL: 2,
			NEWSLETTER: 3,
			CLUB: 4,
		};
		this.view = this.views.NATURAL;
		UserService.user$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(user => {
			this.user = user;
			this.pushChanges();
		});
		NaturalFormService.form$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(form => {
			// console.log(NaturalFormService.values);
			this.values = NaturalFormService.values;
			this.pushChanges();
		});
		// console.log('NaturalFormComponent.onInit', this.naturalForm);
	}

	onClub(event) {
		if (this.user) {
			window.location.href = NaturalFormService.clubProfileUrl;
		} else {
			event.preventDefault();
			const src = STATIC ? '/agora/club-modal.html' : NaturalFormService.clubModalUrl;
			ModalService.open$({ src: src, data: { view: 1 } }).pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(event => {
				// console.log('RegisterOrLoginComponent.onRegister', event);
				if (event instanceof ModalResolveEvent) {
					UserService.setUser(event.data);
					this.user = event.data;
					this.pushChanges();
				}
			});
		}
	}

	onNext(event) {
		this.view = NaturalFormService.values.action;
		this.pushChanges();
	}

	onBack(event) {
		this.view = this.views.NATURAL;
		this.pushChanges();
	}

	get disabled() {
		return NaturalFormService.disabled;
	}

}

NaturalFormComponent.meta = {
	selector: '[natural-form]',
	outputs: ['club']
};
