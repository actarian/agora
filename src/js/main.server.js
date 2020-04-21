const express = require('express');
const bodyParser = require('body-parser');

const path = require('path');
const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole } = require('agora-access-token');

import { environment } from '../environment/environment';

const PORT = process.env.PORT || environment.port;

console.log(environment);

var app = express();

app.disable('x-powered-by');

app.use(express.static(path.join(__dirname, '../../docs/')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

// app.use(express.favicon());

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

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '../../docs/index.html'));
	// response.render('docs/index');
});

app.post('/api/token/rtc', function(request, response) {
	console.log('/api/token/rtc', request.body);
	const payload = request.body || {};
	console.log('/api/token/rtc', payload);
	const duration = 3600;
	const timestamp = Math.floor(Date.now() / 1000);
	const expirationTime = timestamp + duration;
	const uid = payload.uid ? String(payload.uid) : timestamp.toString();
	const role = RtcRole.PUBLISHER;
	const token = RtcTokenBuilder.buildTokenWithUid(environment.appKey, environment.appCertificate, environment.channelName, uid, role, expirationTime);
	console.log('/api/token/rtc', token);
	response.send(JSON.stringify({
		token: token,
	}));
});

app.post('/api/token/rtm', function(request, response) {
	console.log('/api/token/rtm', request);
	const payload = request.body || {};
	console.log('/api/token/rtm', payload);
	const duration = 3600;
	const timestamp = Math.floor(Date.now() / 1000);
	const expirationTime = timestamp + duration;
	const uid = payload.uid ? String(payload.uid) : timestamp.toString();
	const role = RtmRole.PUBLISHER;
	const token = RtmTokenBuilder.buildToken(environment.appKey, environment.appCertificate, uid, role, expirationTime);
	console.log('/api/token/rtm', token);
	response.send(JSON.stringify({
		token: token,
	}));
});

app.listen(PORT, () => {
	console.log(`Listening on ${ PORT }`);
});

// IMPORTANT! Build token with either the uid or with the user account. Comment out the option you do not want to use below.

// Build token with uid
// const token = RtcTokenBuilder.buildTokenWithUid(environment.appKey, environment.appCertificate, environment.channelName, uid, role, expirationTime);

// Build token with user account
// const token = RtcTokenBuilder.buildTokenWithAccount(environment.appKey, environment.appCertificate, environment.channelName, account, role, expirationTime);