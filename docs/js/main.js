/**
 * @license agora v1.0.0
 * (c) 2020 Luca Zampetti <lzampetti@gmail.com>
 * License: MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('rxcomp'), require('rxcomp-form'), require('rxjs/operators'), require('rxjs')) :
  typeof define === 'function' && define.amd ? define(['rxcomp', 'rxcomp-form', 'rxjs/operators', 'rxjs'], factory) :
  (global = global || self, factory(global.rxcomp, global.rxcomp.form, global.rxjs.operators, global.rxjs));
}(this, (function (rxcomp, rxcompForm, operators, rxjs) { 'use strict';

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  var AgoraService = /*#__PURE__*/function () {
    function AgoraService() {
      this.onStreamPublished = this.onStreamPublished.bind(this);
      this.onStreamAdded = this.onStreamAdded.bind(this);
      this.onStreamSubscribed = this.onStreamSubscribed.bind(this);
      this.onStreamRemoved = this.onStreamRemoved.bind(this);
      this.onPeerLeaved = this.onPeerLeaved.bind(this);
      this.onTokenPrivilegeWillExpire = this.onTokenPrivilegeWillExpire.bind(this);
      this.onTokenPrivilegeDidExpire = this.onTokenPrivilegeDidExpire.bind(this);
    }

    var _proto = AgoraService.prototype;

    _proto.connect = function connect() {
      var _this = this;

      this.createClient(function () {
        _this.joinChannel();
      });
    };

    _proto.onError = function onError(error) {
      console.log('Agora', error);
    };

    _proto.onStreamPublished = function onStreamPublished(event) {
      console.log('Publish local stream successfully');
    };

    _proto.onStreamAdded = function onStreamAdded(event) {
      var client = this.client;
      var stream = event.stream;
      var id = stream.getId();
      console.log('New stream added: ' + id);

      if (id !== this.uid) {
        client.subscribe(stream, function (error) {
          console.log('stream subscribe failed', error);
        });
      }
    };

    _proto.onStreamSubscribed = function onStreamSubscribed(event) {
      var stream = event.stream;
      var id = stream.getId();
      console.log('Subscribe remote stream successfully: ' + id);
      var video = document.querySelector('.video-other');

      if (video) {
        video.setAttribute('id', 'agora_remote_' + id);
        video.classList.add('playing');
      } // console.log('video', video);


      stream.play('agora_remote_' + id);
    } // Occurs when the remote stream is removed; for example, a peer user calls Client.unpublish.
    ;

    _proto.onStreamRemoved = function onStreamRemoved(event) {
      var stream = event.stream;
      var id = stream.getId();
      console.log('stream-removed remote-uid: ', id);

      if (id !== this.uid) {
        stream.stop('agora_remote_' + id);
        var video = document.querySelector('.video-other');

        if (video) {
          video.classList.remove('playing');
        }
      }

      console.log('stream-removed remote-uid: ', id);
    };

    _proto.onPeerLeaved = function onPeerLeaved(event) {
      var id = event.uid;
      console.log('peer-leave id', id);

      if (id !== this.uid) {
        var video = document.querySelector('.video-other');

        if (video) {
          video.classList.remove('playing');
        }
      }
    };

    _proto.onTokenPrivilegeWillExpire = function onTokenPrivilegeWillExpire(event) {
      // After requesting a new token
      // client.renewToken(token);
      console.log('onTokenPrivilegeWillExpire');
    };

    _proto.onTokenPrivilegeDidExpire = function onTokenPrivilegeDidExpire(event) {
      // After requesting a new token
      // client.renewToken(token);
      console.log('onTokenPrivilegeDidExpire');
    };

    _proto.createClient = function createClient(next) {
      console.log('agora sdk version: ' + AgoraRTC.VERSION + ' compatible: ' + AgoraRTC.checkSystemRequirements());
      var client = this.client = AgoraRTC.createClient({
        mode: 'live',
        codec: 'h264'
      });
      client.init('ab4289a46cd34da6a61fd8d66774b65f', function () {
        console.log('AgoraRTC client initialized');
        next();
      }, function (error) {
        console.log('AgoraRTC client init failed', error);
      });
      client.on('stream-published', this.onStreamPublished); //subscribe remote stream

      client.on('stream-added', this.onStreamAdded);
      client.on('stream-subscribed', this.onStreamSubscribed);
      client.on('error', this.onError); // Occurs when the peer user leaves the channel; for example, the peer user calls Client.leave.

      client.on('peer-leave', this.onPeerLeaved);
      client.on('stream-removed', this.onStreamRemoved);
      client.on('onTokenPrivilegeWillExpire', this.onTokenPrivilegeWillExpire);
      client.on('onTokenPrivilegeDidExpire', this.onTokenPrivilegeDidExpire);
    };

    _proto.joinChannel = function joinChannel() {
      var _this2 = this;

      var client = this.client;
      var tokenOrKey = null;
      var channelName = 'Channel';
      var uid = null;
      client.join(tokenOrKey, channelName, uid, function (uid) {
        console.log('User ' + uid + ' join channel successfully'); // !!! require localhost or https

        _this2.detectDevices(function (devices) {
          console.log(devices);

          if (devices.videos.length && devices.audios.length) {
            _this2.createLocalStream(uid, devices.audios[0].deviceId, devices.videos[0].deviceId);
          }
        });
      }, function (error) {
        console.log('Join channel failed', error);
      }); // https://console.agora.io/invite?sign=YXBwSWQlM0RhYjQyODlhNDZjZDM0ZGE2YTYxZmQ4ZDY2Nzc0YjY1ZiUyNm5hbWUlM0RaYW1wZXR0aSUyNnRpbWVzdGFtcCUzRDE1ODY5NjM0NDU=// join link expire in 30 minutes
    };

    _proto.detectDevices = function detectDevices(next) {
      AgoraRTC.getDevices(function (devices) {
        devices.filter(function (device) {
          return ['audioinput', 'videoinput'].indexOf(device.kind) !== -1;
        }).map(function (device) {
          return {
            label: device.label,
            deviceId: device.deviceId,
            kind: device.kind
          };
        });
        var videos = [];
        var audios = [];

        for (var i = 0; i < devices.length; i++) {
          var device = devices[i];

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

        next({
          videos: videos,
          audios: audios
        });
      });
    };

    _proto.createLocalStream = function createLocalStream(uid, microphoneId, cameraId) {
      var local = this.local = AgoraRTC.createStream({
        streamID: uid,
        audio: true,
        video: true,
        screen: false,
        microphoneId: microphoneId,
        cameraId: cameraId
      });
      this.initLocalStream();
    };

    _proto.initLocalStream = function initLocalStream() {
      var _this3 = this;

      var client = this.client;
      var local = this.local;
      local.init(function () {
        console.log('getUserMedia successfully');
        var video = document.querySelector('.video-me');

        if (video) {
          video.setAttribute('id', 'agora_local_' + local.streamID);
          local.play('agora_local_' + local.streamID);
        }

        _this3.publishLocalStream();
      }, function (error) {
        console.log('getUserMedia failed', error);
      });
    };

    _proto.publishLocalStream = function publishLocalStream() {
      var client = this.client;
      var local = this.local; //publish local stream

      client.publish(local, function (error) {
        console.log('Publish local stream error: ' + error);
      });
    };

    _proto.unpublishLocalStream = function unpublishLocalStream() {
      var client = this.client;
      var local = this.local;
      client.unpublish(local, function (error) {
        console.log('unpublish failed');
      });
    };

    _proto.leaveChannel = function leaveChannel() {
      client.leave(function () {
        console.log('Leave channel successfully');
      }, function (error) {
        console.log('Leave channel failed');
      });
    };

    return AgoraService;
  }();

  var STATIC = window.location.port === '41999' || window.location.host === 'actarian.github.io';
  var DEVELOPMENT = ['localhost', '127.0.0.1', '0.0.0.0'].indexOf(window.location.host.split(':')[0]) !== -1;

  var LocationService = /*#__PURE__*/function () {
    function LocationService() {}

    LocationService.get = function get(key) {
      var params = new URLSearchParams(window.location.search); // console.log('LocationService.get', params);

      return params.get(key);
    };

    LocationService.set = function set(keyOrValue, value) {
      var params = new URLSearchParams(window.location.search);

      if (typeof keyOrValue === 'string') {
        params.set(keyOrValue, value);
      } else {
        params.set(keyOrValue, '');
      }

      this.replace(params); // console.log('LocationService.set', params, keyOrValue, value);
    };

    LocationService.replace = function replace(params) {
      if (window.history && window.history.pushState) {
        var title = document.title;
        var url = window.location.href.split('?')[0] + "?" + params.toString();
        window.history.pushState(params.toString(), title, url);
      }
    };

    LocationService.deserialize = function deserialize(key) {
      var encoded = this.get('params');
      return this.decode(key, encoded);
    };

    LocationService.serialize = function serialize(keyOrValue, value) {
      var params = this.deserialize();
      var encoded = this.encode(keyOrValue, value, params);
      this.set('params', encoded);
    };

    LocationService.decode = function decode(key, encoded) {
      var decoded = null;

      if (encoded) {
        var json = window.atob(encoded);
        decoded = JSON.parse(json);
      }

      if (key && decoded) {
        decoded = decoded[key];
      }

      return decoded || null;
    };

    LocationService.encode = function encode(keyOrValue, value, params) {
      params = params || {};
      var encoded = null;

      if (typeof keyOrValue === 'string') {
        params[keyOrValue] = value;
      } else {
        params = keyOrValue;
      }

      var json = JSON.stringify(params);
      encoded = window.btoa(json);
      return encoded;
    };

    return LocationService;
  }();

  var ModalEvent = function ModalEvent(data) {
    this.data = data;
  };
  var ModalResolveEvent = /*#__PURE__*/function (_ModalEvent) {
    _inheritsLoose(ModalResolveEvent, _ModalEvent);

    function ModalResolveEvent() {
      return _ModalEvent.apply(this, arguments) || this;
    }

    return ModalResolveEvent;
  }(ModalEvent);
  var ModalRejectEvent = /*#__PURE__*/function (_ModalEvent2) {
    _inheritsLoose(ModalRejectEvent, _ModalEvent2);

    function ModalRejectEvent() {
      return _ModalEvent2.apply(this, arguments) || this;
    }

    return ModalRejectEvent;
  }(ModalEvent);

  var ModalService = /*#__PURE__*/function () {
    function ModalService() {}

    ModalService.open$ = function open$(modal) {
      var _this = this;

      return this.getTemplate$(modal.src).pipe(operators.map(function (template) {
        return {
          node: _this.getNode(template),
          data: modal.data,
          modal: modal
        };
      }), operators.tap(function (node) {
        return _this.modal$.next(node);
      }), operators.switchMap(function (node) {
        return _this.events$;
      }));
    };

    ModalService.load$ = function load$(modal) {};

    ModalService.getTemplate$ = function getTemplate$(url) {
      return rxjs.from(fetch(url).then(function (response) {
        return response.text();
      }));
    };

    ModalService.getNode = function getNode(template) {
      var div = document.createElement("div");
      div.innerHTML = template;
      var node = div.firstElementChild;
      return node;
    };

    ModalService.reject = function reject(data) {
      this.modal$.next(null);
      this.events$.next(new ModalRejectEvent(data));
    };

    ModalService.resolve = function resolve(data) {
      this.modal$.next(null);
      this.events$.next(new ModalResolveEvent(data));
    };

    return ModalService;
  }();
  ModalService.modal$ = new rxjs.Subject();
  ModalService.events$ = new rxjs.Subject();

  var HttpService = /*#__PURE__*/function () {
    function HttpService() {}

    HttpService.http$ = function http$(method, url, data, format) {
      var _this = this;

      if (format === void 0) {
        format = 'json';
      }

      var methods = ['POST', 'PUT', 'PATCH'];
      var response_ = null;
      return rxjs.from(fetch(this.getUrl(url, format), {
        method: method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: methods.indexOf(method) !== -1 ? JSON.stringify(data) : undefined
      }).then(function (response) {
        response_ = response; // console.log(response);

        if (response.ok) {
          return response[format]();
        } else {
          return response.json().then(function (json) {
            return Promise.reject(json);
          });
        }
      })).pipe(operators.catchError(function (error) {
        return rxjs.throwError(_this.getError(error, response_));
      }));
    };

    HttpService.get$ = function get$(url, data, format) {
      var query = this.query(data);
      return this.http$('GET', "" + url + query, undefined, format);
    };

    HttpService.delete$ = function delete$(url) {
      return this.http$('DELETE', url);
    };

    HttpService.post$ = function post$(url, data) {
      return this.http$('POST', url, data);
    };

    HttpService.put$ = function put$(url, data) {
      return this.http$('PUT', url, data);
    };

    HttpService.patch$ = function patch$(url, data) {
      return this.http$('PATCH', url, data);
    };

    HttpService.query = function query(data) {
      return ''; // todo
    };

    HttpService.getUrl = function getUrl(url, format) {
      if (format === void 0) {
        format = 'json';
      }

      // console.log(url);
      return STATIC && format === 'json' && url.indexOf('/') === 0 ? "." + url + ".json" : url;
    };

    HttpService.getError = function getError(object, response) {
      var error = typeof object === 'object' ? object : {};

      if (!error.statusCode) {
        error.statusCode = response ? response.status : 0;
      }

      if (!error.statusMessage) {
        error.statusMessage = response ? response.statusText : object;
      }

      console.log('HttpService.getError', error, object);
      return error;
    };

    return HttpService;
  }();

  var LocalStorageService = /*#__PURE__*/function () {
    function LocalStorageService() {}

    LocalStorageService.delete = function _delete(name) {
      if (this.isLocalStorageSupported()) {
        window.localStorage.removeItem(name);
      }
    };

    LocalStorageService.exist = function exist(name) {
      if (this.isLocalStorageSupported()) {
        return window.localStorage[name] !== undefined;
      }
    };

    LocalStorageService.get = function get(name) {
      var value = null;

      if (this.isLocalStorageSupported() && window.localStorage[name] !== undefined) {
        try {
          value = JSON.parse(window.localStorage[name]);
        } catch (e) {
          console.log('LocalStorageService.get.error parsing', name, e);
        }
      }

      return value;
    };

    LocalStorageService.set = function set(name, value) {
      if (this.isLocalStorageSupported()) {
        try {
          var cache = [];
          var json = JSON.stringify(value, function (key, value) {
            if (typeof value === 'object' && value !== null) {
              if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                return;
              }

              cache.push(value);
            }

            return value;
          });
          window.localStorage.setItem(name, json);
        } catch (e) {
          console.log('LocalStorageService.set.error serializing', name, value, e);
        }
      }
    };

    LocalStorageService.isLocalStorageSupported = function isLocalStorageSupported() {
      if (this.supported) {
        return true;
      }

      var supported = false;

      try {
        supported = 'localStorage' in window && window.localStorage !== null;

        if (supported) {
          window.localStorage.setItem('test', '1');
          window.localStorage.removeItem('test');
        } else {
          supported = false;
        }
      } catch (e) {
        supported = false;
      }

      this.supported = supported;
      return supported;
    };

    return LocalStorageService;
  }();

  var UserService = /*#__PURE__*/function () {
    function UserService() {}

    UserService.setUser = function setUser(user) {
      this.user$.next(user);
    };

    UserService.me$ = function me$() {
      var _this = this;

      return HttpService.get$('/api/users/me').pipe(operators.map(function (user) {
        return _this.mapStatic__(user, 'me');
      }), operators.switchMap(function (user) {
        _this.setUser(user);

        return _this.user$;
      }));
    };

    UserService.register$ = function register$(payload) {
      var _this2 = this;

      return HttpService.post$('/api/users/register', payload).pipe(operators.map(function (user) {
        return _this2.mapStatic__(user, 'register');
      }));
    };

    UserService.update = function update(payload) {
      var _this3 = this;

      return HttpService.post$('/api/users/updateprofile', payload).pipe(operators.map(function (user) {
        return _this3.mapStatic__(user, 'register');
      }));
    };

    UserService.login$ = function login$(payload) {
      var _this4 = this;

      return HttpService.post$('/api/users/login', payload).pipe(operators.map(function (user) {
        return _this4.mapStatic__(user, 'login');
      }));
    };

    UserService.logout$ = function logout$() {
      var _this5 = this;

      return HttpService.post$('/api/users/logout').pipe(operators.map(function (user) {
        return _this5.mapStatic__(user, 'logout');
      }));
    };

    UserService.retrieve$ = function retrieve$(payload) {
      var _this6 = this;

      return HttpService.post$('/api/users/retrievepassword', payload).pipe(operators.map(function (user) {
        return _this6.mapStatic__(user, 'retrieve');
      }));
    };

    UserService.mapStatic__ = function mapStatic__(user, action) {
      if (action === void 0) {
        action = 'me';
      }

      if (!STATIC) {
        return user;
      }

      switch (action) {
        case 'me':
          if (!LocalStorageService.exist('user')) {
            user = null;
          }
          break;

        case 'register':
          LocalStorageService.set('user', user);
          break;

        case 'login':
          LocalStorageService.set('user', user);
          break;

        case 'logout':
          LocalStorageService.delete('user');
          break;
      }

      return user;
    };

    return UserService;
  }();
  UserService.user$ = new rxjs.BehaviorSubject(null);

  var src = STATIC ? '/agora/club-modal.html' : '/Viewdoc.cshtml?co_id=23649';

  var AppComponent = /*#__PURE__*/function (_Component) {
    _inheritsLoose(AppComponent, _Component);

    function AppComponent() {
      return _Component.apply(this, arguments) || this;
    }

    var _proto = AppComponent.prototype;

    // !!! require localhost or https
    _proto.onInit = function onInit() {
      var _getContext = rxcomp.getContext(this),
          node = _getContext.node;

      node.classList.remove('hidden'); // console.log('context', context);

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

      var agora = new AgoraService();
      agora.connect();
    };

    _proto.onDropped = function onDropped(id) {
      console.log('AppComponent.onDropped', id);
    };

    _proto.parseQueryString = function parseQueryString() {
      var action = LocationService.get('action');

      switch (action) {
        case 'login':
          this.openLogin();
          break;

        case 'register':
          this.openRegister();
          break;
      }
    };

    _proto.openLogin = function openLogin() {
      this.openLoginRegisterModal(1);
    };

    _proto.openRegister = function openRegister() {
      this.openLoginRegisterModal(2);
    };

    _proto.openLoginRegisterModal = function openLoginRegisterModal(view) {
      if (view === void 0) {
        view = 1;
      }

      ModalService.open$({
        src: src,
        data: {
          view: view
        }
      }).pipe(operators.takeUntil(this.unsubscribe$)).subscribe(function (event) {
        // console.log('RegisterOrLoginComponent.onRegister', event);
        if (event instanceof ModalResolveEvent) {
          UserService.setUser(event.data);
        }
      });
    } // onView() { const context = getContext(this); }
    // onChanges() {}
    // onDestroy() {}
    ;

    return AppComponent;
  }(rxcomp.Component);
  AppComponent.meta = {
    selector: '[app-component]'
  };

  /*
  import AgentsComponent from './agents/agents.component';
  import AppearDirective from './appear/appear.directive';
  import BimLibraryComponent from './bim-library/bim-library';
  import ClickOutsideDirective from './click-outside/click-outside.directive';
  import ClubForgotComponent from './club/club-forgot.component';
  import ClubModalComponent from './club/club-modal.component';
  import ClubPasswordEditComponent from './club/club-password-edit.component';
  import ClubPasswordRecoveryComponent from './club/club-password-recovery.component';
  import ClubProfileComponent from './club/club-profile.component';
  import ClubSigninComponent from './club/club-signin.component';
  import ClubSignupComponent from './club/club-signup.component';
  import ClubComponent from './club/club.component';
  import DropdownItemDirective from './dropdown/dropdown-item.directive';
  import DropdownDirective from './dropdown/dropdown.directive';
  import ControlCheckboxComponent from './forms/control-checkbox.component';
  import ControlCustomSelectComponent from './forms/control-custom-select.component';
  import ControlEmailComponent from './forms/control-email.component';
  import ControlFileComponent from './forms/control-file.component';
  import ControlPasswordComponent from './forms/control-password.component';
  import ControlSelectComponent from './forms/control-select.component';
  import ControlTextComponent from './forms/control-text.component';
  import ControlTextareaComponent from './forms/control-textarea.component';
  import ErrorsComponent from './forms/errors.component';
  import TestComponent from './forms/test.component';
  import HeaderComponent from './header/header.component';
  import HtmlPipe from './html/html.pipe';
  import LazyDirective from './lazy/lazy.directive';
  import MainMenuComponent from './main-menu/main-menu.component';
  import MediaLibraryComponent from './media-library/media-library';
  import ModalOutletComponent from './modal/modal-outlet.component';
  import ModalComponent from './modal/modal.component';
  import NaturalFormContactComponent from './natural-form/natural-form-contact.component';
  import NaturalFormControlComponent from './natural-form/natural-form-control.component';
  import NaturalFormNewsletterComponent from './natural-form/natural-form-newsletter.component';
  import NaturalFormRequestInfoComponent from './natural-form/natural-form-request-info.component';
  import NaturalFormSearchComponent from './natural-form/natural-form-search.component';
  import NaturalFormSignupComponent from './natural-form/natural-form-signup.component';
  import NaturalFormComponent from './natural-form/natural-form.component';
  import PriceListComponent from './price-list/price-list';
  import RegisterOrLoginComponent from './register-or-login/register-or-login.component';
  import RequestInfoCommercialComponent from './request-info-commercial/request-info-commercial.component';
  import ReservedAreaComponent from './reserved-area/reserved-area.component';
  import ScrollToDirective from './scroll-to/scroll-to.directive';
  import SecureDirective from './secure/secure.directive';
  import FileSizePipe from './size/size.pipe';
  import SwiperListingDirective from './swiper/swiper-listing.directive';
  import SwiperSlidesDirective from './swiper/swiper-slides.directive';
  import SwiperDirective from './swiper/swiper.directive';
  import VideoComponent from './video/video.component';
  import WorkWithUsComponent from './work-with-us/work-with-us.component';
  import YoutubeComponent from './youtube/youtube.component';
  import ZoomableDirective from './zoomable/zoomable.directive';
  */

  var AppModule = /*#__PURE__*/function (_Module) {
    _inheritsLoose(AppModule, _Module);

    function AppModule() {
      return _Module.apply(this, arguments) || this;
    }

    return AppModule;
  }(rxcomp.Module);
  AppModule.meta = {
    imports: [rxcomp.CoreModule, rxcompForm.FormModule],
    declarations: [
      /*
      AgentsComponent,
      AppearDirective,
      BimLibraryComponent,
      ClickOutsideDirective,
      ClubComponent,
      ClubForgotComponent,
      ClubModalComponent,
      ClubPasswordRecoveryComponent,
      ClubPasswordEditComponent,
      ClubProfileComponent,
      ClubSigninComponent,
      ClubSignupComponent,
      ControlCheckboxComponent,
      ControlCustomSelectComponent,
      ControlEmailComponent,
      ControlFileComponent,
      ControlPasswordComponent,
      ControlSelectComponent,
      ControlTextComponent,
      ControlTextareaComponent,
      DropdownDirective,
      DropdownItemDirective,
      ErrorsComponent,
      FileSizePipe,
      HtmlPipe,
      HeaderComponent,
      LazyDirective,
      MainMenuComponent,
      MediaLibraryComponent,
      ModalOutletComponent,
      ModalComponent,
      PriceListComponent,
      NaturalFormComponent,
      NaturalFormSearchComponent,
      NaturalFormContactComponent,
      NaturalFormRequestInfoComponent,
      NaturalFormControlComponent,
      NaturalFormNewsletterComponent,
      NaturalFormSignupComponent,
      RequestInfoCommercialComponent,
      RegisterOrLoginComponent,
      ReservedAreaComponent,
      SecureDirective,
      ScrollToDirective,
      SwiperDirective,
      SwiperListingDirective,
      SwiperSlidesDirective,
      TestComponent,
      // ValueDirective,
      VideoComponent,
      WorkWithUsComponent,
      YoutubeComponent,
      ZoomableDirective,
      */
    ],
    bootstrap: AppComponent
  };

  rxcomp.Browser.bootstrap(AppModule);

})));
