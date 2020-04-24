// @ts-ignore
// const AgoraRTC = require('agora-rtc-sdk');

import AgoraRTM from 'agora-rtm-sdk';
import { BehaviorSubject, of , Subject } from 'rxjs';
import { environment } from '../../environment/environment';
import Emittable from '../emittable/emittable';
import HttpService from '../http/http.service';

export const RoleType = {
	Attendee: 'attendee',
	Publisher: 'publisher',
};

export const MessageType = {
	Ping: 'ping',
	RequestControl: 'requestControl',
	RequestControlAccepted: 'requestControlAccepted',
	RequestControlRejected: 'requestControlRejected',
	RequestControlDismiss: 'requestControlDismiss',
	RequestControlDismissed: 'requestControlDismissed',
	SlideChange: 'slideChange',
	SlideRotate: 'slideRotate',
	MenuNavTo: 'menuNavTo',
};

export default class AgoraService extends Emittable {

	static getSingleton(state) {
		console.log('getSingleton', state);
		if (!this.AGORA) {
			this.AGORA = new AgoraService(state);
		}
		return this.AGORA;
	}

	constructor(state) {
		if (AgoraService.AGORA) {
			throw ('AgoraService is a singleton');
		}
		super();
		this.onStreamPublished = this.onStreamPublished.bind(this);
		this.onStreamAdded = this.onStreamAdded.bind(this);
		this.onStreamSubscribed = this.onStreamSubscribed.bind(this);
		this.onStreamRemoved = this.onStreamRemoved.bind(this);
		this.onPeerLeaved = this.onPeerLeaved.bind(this);
		this.onTokenPrivilegeWillExpire = this.onTokenPrivilegeWillExpire.bind(this);
		this.onTokenPrivilegeDidExpire = this.onTokenPrivilegeDidExpire.bind(this);
		this.state = {
			role: RoleType.ATTENDEE,
			connected: false,
			locked: false,
			control: false,
			cameraMuted: true,
			audioMuted: true,
		};
		if (state) {
			this.state = Object.assign(this.state, state);
		}
		this.state$ = new BehaviorSubject(this.state);
		this.message$ = new Subject();
	}

	setState(state) {
		Object.assign(this.state, state);
		this.state$.next(this.state);
	}

	connect$() {
		this.createClient(() => {
			this.getRtcToken().subscribe(token => {
				// console.log('token', token);
				this.joinChannel(token.token);
			});
		});
		return this.state$;
	}

	getRtcToken() {
		if (environment.apiEnabled) {
			return HttpService.post$('/api/token/rtc', { uid: null });
		} else {
			return of({ token: null });
		}
	}

	getRtmToken(uid) {
		if (environment.apiEnabled) {
			return HttpService.post$('/api/token/rtm', { uid: uid });
		} else {
			return of({ token: null });
		}
	}

	createClient(next) {
		if (this.client) {
			next();
		}
		// console.log('agora rtc sdk version: ' + AgoraRTC.VERSION + ' compatible: ' + AgoraRTC.checkSystemRequirements());
		AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.ERROR);
		const client = this.client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' }); // rtc
		client.init(environment.appKey, () => {
			// console.log('AgoraRTC client initialized');
			next();
		}, (error) => {
			// console.log('AgoraRTC client init failed', error);
			this.client = null;
		});
		client.on('stream-published', this.onStreamPublished);
		//subscribe remote stream
		client.on('stream-added', this.onStreamAdded);
		client.on('stream-subscribed', this.onStreamSubscribed);
		client.on('error', this.onError);
		// Occurs when the peer user leaves the channel; for example, the peer user calls Client.leave.
		client.on('peer-leave', this.onPeerLeaved);
		client.on('stream-removed', this.onStreamRemoved);
		client.on('onTokenPrivilegeWillExpire', this.onTokenPrivilegeWillExpire);
		client.on('onTokenPrivilegeDidExpire', this.onTokenPrivilegeDidExpire);
		// console.log('agora rtm sdk version: ' + AgoraRTM.VERSION + ' compatible');
		const messageClient = this.messageClient = AgoraRTM.createInstance(environment.appKey, { logFilter: AgoraRTM.LOG_FILTER_ERROR }); // LOG_FILTER_DEBUG
		messageClient.on('ConnectionStateChanged', console.error);
		messageClient.on('MessageFromPeer', console.warn);
	}

	joinChannel(token) {
		const client = this.client;
		const uid = null;
		token = null; // !!!
		client.join(token, environment.channelName, uid, (uid) => {
			// console.log('User ' + uid + ' join channel successfully');
			this.getRtmToken(uid).subscribe(token => {
				// console.log('token', token);
				this.joinMessageChannel(token.token, uid).then((success) => {
					// console.log('joinMessageChannel.success', success);
					setTimeout(() => {
						this.setState({ connected: true });
					}, 2000);
				}, error => {
					// console.log('joinMessageChannel.error', error);
				});
			});
			// !!! require localhost or https
			this.detectDevices((devices) => {
				// console.log(devices);
				const cameraId = devices.videos.length ? devices.videos[0].deviceId : null;
				const microphoneId = devices.audios.length ? devices.audios[0].deviceId : null;
				this.createLocalStream(uid, microphoneId, cameraId);
			});
		}, (error) => {
			console.log('Join channel failed', error);
		});
		// https://console.agora.io/invite?sign=YXBwSWQlM0RhYjQyODlhNDZjZDM0ZGE2YTYxZmQ4ZDY2Nzc0YjY1ZiUyNm5hbWUlM0RaYW1wZXR0aSUyNnRpbWVzdGFtcCUzRDE1ODY5NjM0NDU=// join link expire in 30 minutes
	}

	joinMessageChannel(token, uid) {
		return new Promise((resolve, reject) => {
			const messageClient = this.messageClient;
			token = null; // !!!
			messageClient.login({ uid: uid.toString() }).then(() => {
				this.messageChannel = messageClient.createChannel(environment.channelName);
				return this.messageChannel.join();
			}).then(() => {
				this.messageChannel.on('ChannelMessage', this.onMessage);
				resolve(uid);
			}).catch(reject);
		});
	}

	sendMessage(message) {
		message.wrc_version = 'beta';
		message.uid = this.uid;
		const messageChannel = this.messageChannel;
		messageChannel.sendMessage({ text: JSON.stringify(message) });
		// console.log('wrc: send', message);
		if (message.rpcid) {
			return new Promise(resolve => {
				this.once(`message-${message.rpcid}`, (message) => {
					resolve(message);
				});
			});
		} else {
			return Promise.resolve(message);
		}
	}

	detectDevices(next) {
		AgoraRTC.getDevices((devices) => {
			devices
				.filter(device => ['audioinput', 'videoinput'].indexOf(device.kind) !== -1)
				.map((device) => {
					return {
						label: device.label,
						deviceId: device.deviceId,
						kind: device.kind,
					};
				});
			const videos = [];
			const audios = [];
			for (let i = 0; i < devices.length; i++) {
				const device = devices[i];
				if ('videoinput' == device.kind) {
					videos.push({
						label: device.label || 'camera-' + videos.length,
						deviceId: device.deviceId,
						kind: device.kind
					});
				}
				if ('audioinput' == device.kind) {
					audios.push({
						label: device.label || 'microphone-' + videos.length,
						deviceId: device.deviceId,
						kind: device.kind
					});
				}
			}
			next({ videos: videos, audios: audios });
		});
	}

	createLocalStream(uid, microphoneId, cameraId) {
		if (microphoneId || cameraId) {
			const local = this.local = AgoraRTC.createStream({
				streamID: uid,
				microphoneId: microphoneId,
				cameraId: cameraId,
				audio: microphoneId ? true : false,
				video: cameraId ? true : false,
				screen: false,
			});
			this.initLocalStream();
		}
	}

	initLocalStream() {
		const client = this.client;
		const local = this.local;
		local.init(() => {
			// console.log('getUserMedia successfully');
			const video = document.querySelector('.video--local');
			if (video) {
				video.setAttribute('id', 'agora_local_' + local.streamID);
				local.play('agora_local_' + local.streamID);
			}
			this.setState({ local: this.uid });
			this.publishLocalStream();
		}, (error) => {
			console.log('getUserMedia failed', error);
		});
	}

	publishLocalStream() {
		const client = this.client;
		const local = this.local;
		//publish local stream
		client.publish(local, (error) => {
			console.log('Publish local stream error: ' + error);
		});
	}

	unpublishLocalStream() {
		const client = this.client;
		const local = this.local;
		client.unpublish(local, (error) => {
			console.log('unpublish failed');
		});
	}

	leaveChannel() {
		const client = this.client;
		client.leave(() => {
			// console.log('Leave channel successfully');
			this.setState({ connected: false });
			const messageChannel = this.messageChannel;
			const messageClient = this.messageClient;
			messageChannel.leave();
			messageClient.logout();
		}, (error) => {
			console.log('Leave channel failed');
		});
	}

	toggleCamera() {
		const local = this.local;
		console.log('toggleCamera', local);
		if (local) {
			if (local.video) {
				local.muteVideo();
			} else {
				local.unmuteVideo();
			}
		}
	}

	toggleAudio() {
		const local = this.local;
		console.log(local);
		if (local) {
			if (local.audio) {
				local.muteAudio();
			} else {
				local.unmuteAudio();
			}
		}
	}

	toggleControl() {
		if (this.control) {
			this.sendRemoteControlDismiss((control) => {
				this.setState({ control: !control });
			});
		} else {
			this.sendRemoteControlRequest((control) => {
				this.setState({ control: control });
			});
		}
	}

	getRemoteTargetUID() {
		if (!this.rtmChannel || !this.cname) {
			throw new Error("not join channel");
		}
		return this.sendMessage({
			type: MessageType.Ping,
			rpcid: Date.now().toString(),
		}).then(message => {
			return message.payload.uid;
		});
	}

	sendRemoteControlDismiss(message) {
		return new Promise((resolve, reject) => {
			this.sendMessage({
				type: MessageType.RequestControlDismiss,
				rpcid: Date.now().toString(),
				payload: {
					message
				},
			}).then((message) => {
				if (message.type === MessageType.RequestControlDismissed) {
					resolve(true);
				} else if (message.type === MessageType.RequestControlRejected) {
					resolve(false);
				}
			});
		});
	}

	sendRemoteControlRequest(message) {
		return new Promise((resolve, reject) => {
			this.sendMessage({
				type: MessageType.RequestControl,
				rpcid: Date.now().toString(),
				payload: {
					message
				},
			}).then((message) => {
				if (message.type === MessageType.RequestControlAccepted) {
					/*
			  this.remoteDeviceInfo = message.payload;
			  if (this.playerElement) {
				this.remoteStream.play(this.playerElement.id, { fit: 'contain', muted: true });
				this.controlMouse()
				resolve(true);
				return;
			  } else {
				reject('request not accepted');
			  }
			  */
					resolve(true);
				} else if (message.type === MessageType.RequestControlRejected) {
					// this.remoteDeviceInfo = undefined
					resolve(false);
				}
			});
		});
	}

	getSessionStats() {
		const client = this.client;
		client.getSessionStats((stats) => {
			console.log(`Current Session Duration: ${stats.Duration}`);
			console.log(`Current Session UserCount: ${stats.UserCount}`);
			console.log(`Current Session SendBytes: ${stats.SendBytes}`);
			console.log(`Current Session RecvBytes: ${stats.RecvBytes}`);
			console.log(`Current Session SendBitrate: ${stats.SendBitrate}`);
			console.log(`Current Session RecvBitrate: ${stats.RecvBitrate}`);
		});
	}

	getSystemStats() {
		const client = this.client;
		client.getSystemStats((stats) => {
			console.log(`Current battery level: ${stats.BatteryLevel}`);
		});
	}

	// events

	onError(error) {
		console.log('Agora', error);
	}

	onMessage(data, uid) {
		if (uid !== this.uid) {
			const message = JSON.parse(data.text);
			console.log('wrc: receive', message);
			if (message.rpcid) {
				this.emit(`message-${message.rpcid}`, message);
			}
			this.message$.next(message);
			/*
			// this.emit('wrc-message', message);
			if (message.type === WRCMessageType.WRC_CLOSE) {
			  console.log('receive wrc close')
			  this.cleanRemote()
			  this.emit('remote-close')
			}
			*/
		}
	}

	onStreamPublished(event) {
		console.log('Publish local stream successfully');
	}

	onStreamAdded(event) {
		const client = this.client;
		var stream = event.stream;
		var id = stream.getId();
		console.log('New stream added: ' + id);
		if (id !== this.uid) {
			client.subscribe(stream, (error) => {
				console.log('stream subscribe failed', error);
			});
		}
	}

	onStreamSubscribed(event) {
		var stream = event.stream;
		var id = stream.getId();
		console.log('Subscribe remote stream successfully: ' + id);
		const video = document.querySelector('.video--other');
		if (video) {
			video.setAttribute('id', 'agora_remote_' + id);
			video.classList.add('playing');
		}
		this.setState({ remote: id });
		// console.log('video', video);
		stream.play('agora_remote_' + id);
	}

	// Occurs when the remote stream is removed; for example, a peer user calls Client.unpublish.
	onStreamRemoved(event) {
		var stream = event.stream;
		var id = stream.getId();
		// console.log('stream-removed remote-uid: ', id);
		if (id !== this.uid) {
			stream.stop('agora_remote_' + id);
			const video = document.querySelector('.video--other');
			if (video) {
				video.classList.remove('playing');
			}
		}
		this.setState({ remote: null });
		// console.log('stream-removed remote-uid: ', id);
	}

	onPeerLeaved(event) {
		var id = event.uid;
		// console.log('peer-leave id', id);
		if (id !== this.uid) {
			const video = document.querySelector('.video--other');
			if (video) {
				video.classList.remove('playing');
			}
			this.setState({ remote: null });
		} else {
			this.setState({ local: null });
		}
	}

	onTokenPrivilegeWillExpire(event) {
		// After requesting a new token
		// client.renewToken(token);
		console.log('onTokenPrivilegeWillExpire');
	}

	onTokenPrivilegeDidExpire(event) {
		// After requesting a new token
		// client.renewToken(token);
		console.log('onTokenPrivilegeDidExpire');
	}

}
