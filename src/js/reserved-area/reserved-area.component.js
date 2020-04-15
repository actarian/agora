import { Component } from 'rxcomp';
import { of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import UserService from '../user/user.service';

export default class ReservedAreaComponent extends Component {

	onInit() {
		UserService.me$().pipe(
			catchError(() => of (null)),
			takeUntil(this.unsubscribe$)
		).subscribe(user => {
			this.user = user;
		});
	}

	doLogout(event) {
		UserService.logout$().subscribe(() => {
			this.user = null;
			window.location.href = '/';
		});
	}

	onProfileUpdate(event) {

	}

	onPasswordUpdate(event) {

	}

}

ReservedAreaComponent.meta = {
	selector: '[reserved-area]',
};
