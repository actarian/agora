export default class AgoraService {

	constructor() {
		this.onStreamPublished = this.onStreamPublished.bind(this);
		this.onStreamAdded = this.onStreamAdded.bind(this);
		this.onStreamSubscribed = this.onStreamSubscribed.bind(this);
		this.onStreamRemoved = this.onStreamRemoved.bind(this);
		this.onPeerLeaved = this.onPeerLeaved.bind(this);
		this.onTokenPrivilegeWillExpire = this.onTokenPrivilegeWillExpire.bind(this);
		this.onTokenPrivilegeDidExpire = this.onTokenPrivilegeDidExpire.bind(this);
	}

	connect() {
		this.createClient(() => {
			this.joinChannel();
		});
	}

	onError(error) {
		console.log('Agora', error);
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
			client.subscribe(stream, function(error) {
				console.log('stream subscribe failed', error);
			});
		}
	}

	onStreamSubscribed(event) {
		var stream = event.stream;
		var id = stream.getId();
		console.log('Subscribe remote stream successfully: ' + id);
		const video = document.querySelector('.video-other');
		if (video) {
			video.setAttribute('id', 'agora_remote_' + id);
			video.classList.add('playing');
		}
		// console.log('video', video);
		stream.play('agora_remote_' + id);
	}

	// Occurs when the remote stream is removed; for example, a peer user calls Client.unpublish.
	onStreamRemoved(event) {
		var stream = event.stream;
		var id = stream.getId();
		console.log('stream-removed remote-uid: ', id);
		if (id !== this.uid) {
			stream.stop('agora_remote_' + id);
			const video = document.querySelector('.video-other');
			if (video) {
				video.classList.remove('playing');
			}
		}
		console.log('stream-removed remote-uid: ', id);
	}

	onPeerLeaved(event) {
		var id = event.uid;
		console.log('peer-leave id', id);
		if (id !== this.uid) {
			const video = document.querySelector('.video-other');
			if (video) {
				video.classList.remove('playing');
			}
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

	createClient(next) {
		console.log('agora sdk version: ' + AgoraRTC.VERSION + ' compatible: ' + AgoraRTC.checkSystemRequirements());
		const client = this.client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' });
		client.init('ab4289a46cd34da6a61fd8d66774b65f', function() {
			console.log('AgoraRTC client initialized');
			next();
		}, function(error) {
			console.log('AgoraRTC client init failed', error);
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
	}

	joinChannel() {
		const client = this.client;
		const tokenOrKey = null;
		const channelName = 'Channel';
		const uid = null;
		client.join(tokenOrKey, channelName, uid, (uid) => {
			console.log('User ' + uid + ' join channel successfully');
			// !!! require localhost or https
			this.detectDevices((devices) => {
				console.log(devices);
				if (devices.videos.length && devices.audios.length) {
					this.createLocalStream(uid, devices.audios[0].deviceId, devices.videos[0].deviceId);
				};
			});
		}, function(error) {
			console.log('Join channel failed', error);
		});
		// https://console.agora.io/invite?sign=YXBwSWQlM0RhYjQyODlhNDZjZDM0ZGE2YTYxZmQ4ZDY2Nzc0YjY1ZiUyNm5hbWUlM0RaYW1wZXR0aSUyNnRpbWVzdGFtcCUzRDE1ODY5NjM0NDU=// join link expire in 30 minutes
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
		const local = this.local = AgoraRTC.createStream({
			streamID: uid,
			audio: true,
			video: true,
			screen: false,
			microphoneId: microphoneId,
			cameraId: cameraId
		});
		this.initLocalStream();
	}

	initLocalStream() {
		const client = this.client;
		const local = this.local;
		local.init(() => {
			console.log('getUserMedia successfully');
			const video = document.querySelector('.video-me');
			if (video) {
				video.setAttribute('id', 'agora_local_' + local.streamID);
				local.play('agora_local_' + local.streamID);
			}
			this.publishLocalStream();
		}, function(error) {
			console.log('getUserMedia failed', error);
		});
	}

	publishLocalStream() {
		const client = this.client;
		const local = this.local;
		//publish local stream
		client.publish(local, function(error) {
			console.log('Publish local stream error: ' + error);
		});
	}

	unpublishLocalStream() {
		const client = this.client;
		const local = this.local;
		client.unpublish(local, function(error) {
			console.log('unpublish failed');
		});
	}

	leaveChannel() {
		client.leave(function() {
			console.log('Leave channel successfully');
		}, function(error) {
			console.log('Leave channel failed');
		});
	}

}
