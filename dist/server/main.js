/**
 * @license agora v1.0.0
 * (c) 2020 Luca Zampetti <lzampetti@gmail.com>
 * License: MIT
 */

'use strict';

var environment = {
  appKey: 'ab4289a46cd34da6a61fd8d66774b65f',
  appCertificate: '',
  channelName: 'Channel',
  port: 5000
};

var express = require('express');

var path = require('path');

var _require = require('agora-access-token'),
    RtcTokenBuilder = _require.RtcTokenBuilder,
    RtmTokenBuilder = _require.RtmTokenBuilder,
    RtcRole = _require.RtcRole,
    RtmRole = _require.RtmRole;
var PORT = process.env.PORT || environment.port;
console.log(environment);
var app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, '../../docs/'))); // app.use(express.favicon());

/*
app.get('/', function(request, response) {
	response.send('Hello World!');
});
*/

/*
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', (request, response) => response.render('pages/index'));
*/
// app.set('view engine', 'handlebars');

app.get('/', function (request, response) {
  response.sendFile(path.join(__dirname + '../../docs/index.html')); // response.render('docs/index');
});
app.post('/api/token/rtc', function (request, response) {
  var duration = 3600;
  var timestamp = Math.floor(Date.now() / 1000);
  var expirationTime = timestamp + duration;
  var uid = request.uid || timestamp;
  var role = RtcRole.PUBLISHER;
  var token = RtcTokenBuilder.buildTokenWithUid(environment.appKey, environment.appCertificate, environment.channelName, uid, role, expirationTime);
  console.log('/api/token/rtc', token);
  response.send(JSON.stringify({
    token: token
  }));
});
app.post('/api/token/rtm', function (request, response) {
  var duration = 3600;
  var timestamp = Math.floor(Date.now() / 1000);
  var expirationTime = timestamp + duration;
  var uid = request.uid || timestamp;
  var role = RtmRole.PUBLISHER;
  var token = RtmTokenBuilder.buildTokenWithUid(environment.appKey, environment.appCertificate, environment.channelName, uid, role, expirationTime);
  console.log('/api/token/rtm', token);
  response.send(JSON.stringify({
    token: token
  }));
});
app.listen(PORT, function () {
  console.log("Listening on " + PORT);
}); // IMPORTANT! Build token with either the uid or with the user account. Comment out the option you do not want to use below.
// Build token with uid
// const token = RtcTokenBuilder.buildTokenWithUid(environment.appKey, environment.appCertificate, environment.channelName, uid, role, expirationTime);
// Build token with user account
// const token = RtcTokenBuilder.buildTokenWithAccount(environment.appKey, environment.appCertificate, environment.channelName, account, role, expirationTime);
//# sourceMappingURL=main.js.map
