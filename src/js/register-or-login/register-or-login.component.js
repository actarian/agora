import { Component } from 'rxcomp';
import { takeUntil } from 'rxjs/operators';
import { STATIC } from '../environment/environment';
import ModalService, { ModalResolveEvent } from '../modal/modal.service';
import UserService from '../user/user.service';

const src = STATIC ? '/agora/club-modal.html' : '/Viewdoc.cshtml?co_id=23649';

export default class RegisterOrLoginComponent extends Component {

	onRegister(event) {
		// console.log('RegisterOrLoginComponent.onRegister');
		event.preventDefault();
		ModalService.open$({ src: src, data: { view: 2 } }).pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			// console.log('RegisterOrLoginComponent.onRegister', event);
			if (event instanceof ModalResolveEvent) {
				UserService.setUser(event.data);
			}
		});
		// this.pushChanges();
	}

	onLogin(event) {
		// console.log('RegisterOrLoginComponent.onLogin');
		event.preventDefault();
		ModalService.open$({ src: src, data: { view: 1 } }).pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			// console.log('RegisterOrLoginComponent.onLogin', event);
			if (event instanceof ModalResolveEvent) {
				UserService.setUser(event.data);
			}
		});
		// this.pushChanges();
	}

}

RegisterOrLoginComponent.meta = {
	selector: '[register-or-login]',
};
