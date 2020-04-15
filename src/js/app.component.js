import { Component, getContext } from 'rxcomp';
import { takeUntil } from 'rxjs/operators';
import { STATIC } from './environment/environment';
import LocationService from './location/location.service';
import ModalService, { ModalResolveEvent } from './modal/modal.service';
import UserService from './user/user.service';

const src = STATIC ? '/agora/club-modal.html' : '/Viewdoc.cshtml?co_id=23649';

export default class AppComponent extends Component {

	onInit() {
		const { node } = getContext(this);
		node.classList.remove('hidden');
		// console.log('context', context);
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
		this.createClient(() => {
			this.joinChannel();
		});
	}

	createClient(next) {
		console.log("agora sdk version: " + AgoraRTC.VERSION + " compatible: " + AgoraRTC.checkSystemRequirements());
		const client = this.client = AgoraRTC.createClient({ mode: 'live', codec: "h264" });
		client.init('ab4289a46cd34da6a61fd8d66774b65f', function() {
			console.log("AgoraRTC client initialized");
			next();
		}, function(error) {
			console.log("AgoraRTC client init failed", error);
		});
		client.on('stream-published', function(event) {
			console.log("Publish local stream successfully");
		});
		//subscribe remote stream
		client.on('stream-added', function(event) {
			var stream = event.stream;
			var id = stream.getId();
			console.log("New stream added: " + id);
			if (id !== this.uid) {
				client.subscribe(stream, function(error) {
					console.log("stream subscribe failed", error);
				});
			}
			/*
			client.subscribe(stream, function(error) {
				console.log("Subscribe stream failed", error);
			});
			*/
		});
		client.on('stream-subscribed', function(event) {
			var stream = event.stream;
			var id = stream.getId();
			console.log("Subscribe remote stream successfully: " + id);
			const video = document.querySelector('.video');
			if (video) {
				video.setAttribute('id', 'agora_remote_' + id);
				video.classList.add('playing');
			}
			stream.play('agora_remote_' + id);
		});
		client.on("error", (error) => {
			console.log('Agora', error);
		})
		// Occurs when the peer user leaves the channel; for example, the peer user calls Client.leave.
		client.on("peer-leave", function(event) {
			var id = event.uid;
			console.log("peer-leave id", id);
			if (id !== this.uid) {
				const video = document.querySelector('.video');
				if (video) {
					video.classList.remove('playing');
				}
			}
		});
		// Occurs when the remote stream is removed; for example, a peer user calls Client.unpublish.
		client.on("stream-removed", function(event) {
			var stream = event.stream;
			var id = stream.getId();
			console.log('stream-removed remote-uid: ', id);
			if (id !== this.uid) {
				stream.stop("agora_remote_" + id);
				const video = document.querySelector('.video');
				if (video) {
					video.classList.remove('playing');
				}
			}
			console.log('stream-removed remote-uid: ', id);
		});
		client.on("onTokenPrivilegeWillExpire", function() {
			// After requesting a new token
			// client.renewToken(token);
			console.log("onTokenPrivilegeWillExpire");
		});
		client.on("onTokenPrivilegeDidExpire", function() {
			// After requesting a new token
			// client.renewToken(token);
			console.log("onTokenPrivilegeDidExpire");
		});
	}

	joinChannel() {
		const client = this.client;
		const tokenOrKey = null;
		const channelName = 'Channel';
		const uid = null;
		client.join(tokenOrKey, channelName, uid, (uid) => {
			console.log("User " + uid + " join channel successfully");
			this.detectDevices((devices) => {
				if (devices.videos.length && devices.audios.length) {
					this.publishVideo(uid, microphoneId, cameraId);
				};
			});
		}, function(error) {
			console.log("Join channel failed", error);
		});
		// https://console.agora.io/invite?sign=YXBwSWQlM0RhYjQyODlhNDZjZDM0ZGE2YTYxZmQ4ZDY2Nzc0YjY1ZiUyNm5hbWUlM0RaYW1wZXR0aSUyNnRpbWVzdGFtcCUzRDE1ODY5NjM0NDU=// join link expire in 30 minutes
	}

	detectDevices(next) {
		AgoraRTC.getDevices((devices) => {
			devices
				.filter(device => ['audioinput', 'videoinput'].indexOf(device.kind) !== -1)
				.map((device) => {
					return {
						name: device.label,
						value: device.deviceId,
						kind: device.kind,
					};
				});
			const videos = [];
			const audios = [];
			for (let i = 0; i < devices.length; i++) {
				const device = devices[i];
				if ('videoinput' == device.kind) {
					const name = device.label;
					const value = device.deviceId;
					if (!name) {
						name = "camera-" + videos.length;
					}
					videos.push({
						name: name,
						value: value,
						kind: device.kind
					});
				}
				if ('audioinput' == device.kind) {
					const name = device.label;
					const value = device.deviceId;
					if (!name) {
						name = "microphone-" + audios.length;
					}
					audios.push({
						name: name,
						value: value,
						kind: device.kind
					});
				}
			}
			next({ videos: videos, audios: audios });
		});
	}

	publishVideo(uid, microphoneId, cameraId) {
		const client = this.client;
		const localStream = AgoraRTC.createStream({
			streamID: uid,
			audio: true,
			video: true,
			screen: false,
			microphoneId: microphoneId,
			cameraId: cameraId
		});
		localStream.init(function() {
			console.log("getUserMedia successfully");
			localStream.play('agora_local');
			//publish local stream
			client.publish(localStream, function(error) {
				console.log("Publish local stream error: " + error);
			});
		}, function(error) {
			console.log("getUserMedia failed", error);
		});
		this.localStream = localStream;
	}

	unpublishVideo() {
		const client = this.client;
		const localStream = this.localStream;
		client.unpublish(localStream, function(error) {
			console.log("unpublish failed");
		});
	}

	leaveChannel() {
		client.leave(function() {
			console.log("Leave channel successfully");
		}, function(error) {
			console.log("Leave channel failed");
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

	openLogin() {
		this.openLoginRegisterModal(1);
	}

	openRegister() {
		this.openLoginRegisterModal(2);
	}

	openLoginRegisterModal(view = 1) {
		ModalService.open$({ src: src, data: { view } }).pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(event => {
			// console.log('RegisterOrLoginComponent.onRegister', event);
			if (event instanceof ModalResolveEvent) {
				UserService.setUser(event.data);
			}
		});
	}

	// onView() { const context = getContext(this); }

	// onChanges() {}

	// onDestroy() {}
}

AppComponent.meta = {
	selector: '[app-component]',
};
