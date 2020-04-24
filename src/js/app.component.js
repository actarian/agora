import { Component, getContext } from 'rxcomp';
// import UserService from './user/user.service';
import { FormControl, FormGroup, Validators } from 'rxcomp-form';
import { first, takeUntil } from 'rxjs/operators';
import AgoraService, { MessageType, RoleType } from './agora/agora.service';
import { BASE_HREF } from './const';
import HttpService from './http/http.service';
import LocationService from './location/location.service';
import ModalService, { ModalResolveEvent } from './modal/modal.service';

const CONTROL_REQUEST = BASE_HREF + 'control-request.html';

const DEBUG = true;

export class AppComponent extends Component {

	// !!! require localhost or https

	onInit() {
		const { node } = getContext(this);
		node.classList.remove('hidden');
		// console.log('context', context);
		/*
		UserService.user$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(user => {
			console.log('AppComponent.user$', user);
			this.user = user;
			this.pushChanges();
		});
		setTimeout(() => {
			this.parseQueryString();
		}, 500);
		*/
		this.items = [];
		this.item = null;
		this.form = null;
		this.state = {
			role: LocationService.get('role') || RoleType.Attendee,
			connecting: false,
			connected: false,
			locked: false,
			control: false,
			cameraMuted: false,
			audioMuted: false,
		};
		if (!DEBUG) {
			this.agora = new AgoraService(this.state);
			this.state = this.agora.state;
			this.agora.message$.pipe(
				takeUntil(this.unsubscribe$)
			).subscribe(message => {
				console.log('message', message);
				switch (message.type) {
					case MessageType.RequestControl:
						this.onRemoteControlRequest(message);
						break;
				}
			});
		} else {
			this.state.connected = true;
		}
		this.loadData();
	}

	onPrevent(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		console.log('onPrevent');
	}

	loadData() {
		HttpService.get$(BASE_HREF + 'api/data.json').pipe(
			first()
		).subscribe(data => {
			this.data = data;
			this.initForm();
		});
	}

	initForm() {
		const data = this.data;
		const form = this.form = new FormGroup({
			product: new FormControl(data.products[0].id, Validators.RequiredValidator()),
		});
		const controls = this.controls = form.controls;
		controls.product.options = data.products;
		form.changes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe((changes) => {
			// console.log('form.changes$', changes, form.valid);
			console.log(changes.product);
			const product = data.products.find(x => x.id === changes.product);
			this.items = [];
			this.item = null;
			this.pushChanges();
			setTimeout(() => {
				this.items = product ? product.items : [];
				this.item = product;
				this.pushChanges();
			}, 1);
		});
	}

	connect() {
		if (!this.state.connecting) {
			this.state.connecting = true;
			this.pushChanges();
			setTimeout(() => {
				this.agora.connect$().pipe(
					takeUntil(this.unsubscribe$)
				).subscribe((state) => {
					this.state = Object.assign(this.state, state);
					this.pushChanges();
				});
			}, 1000);
		}
	}

	disconnect() {
		this.state.connecting = false;
		if (!DEBUG) {
			this.agora.leaveChannel();
		} else {
			this.state.connected = false;
			this.pushChanges();
		}
	}

	onChange(index) {
		if (!DEBUG && this.state.control) {
			this.agora.sendMessage({
				type: MessageType.SlideChange,
				index
			});
		}
	}

	onRotate(coords) {
		if (!DEBUG && this.state.control) {
			this.agora.sendMessage({
				type: MessageType.SlideRotate,
				coords
			});
		}
	}

	onRemoteControlRequest(message) {
		ModalService.open$({ src: CONTROL_REQUEST, data: null }).pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			if (event instanceof ModalResolveEvent) {
				message.type = MessageType.RequestControlAccepted;
				this.state.locked = true;
			} else {
				message.type = MessageType.RequestControlRejected;
				this.state.locked = false;
			}
			if (!DEBUG) {
				this.agora.sendMessage(message);
			}
			this.pushChanges();
		});
	}

	onDropped(id) {
		console.log('AppComponent.onDropped', id);
	}

	parseQueryString() {
		const action = LocationService.get('action');
		switch (action) {
			case 'login':
				this.openLogin();
				break;
			case 'register':
				this.openRegister();
				break;
		}
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	// onDestroy() {}

	toggleCamera() {
		if (!DEBUG) {
			this.agora.toggleCamera();
		}
	}

	toggleAudio() {
		if (!DEBUG) {
			this.agora.toggleAudio();
		}
	}

	toggleControl() {
		if (!DEBUG) {
			this.agora.toggleControl();
		} else {
			this.onRemoteControlRequest({});
		}
	}

	addToWishlist() {
		if (!this.item.added) {
			this.item.added = true;
			this.item.likes++;
			this.pushChanges();
		}
	}

}

AppComponent.meta = {
	selector: '[app-component]',
};
