const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole } = require('agora-access-token');
const environment = require('./environment/environment');

var app = express();

app.disable('x-powered-by');

app.use(express.favicon());

app.use(express.static(path.join(__dirname, 'docs')));

/*
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', (request, response) => response.render('pages/index'));
*/

/*
app.get('/', function(request, response) {
	response.send('Hello World!');
});
*/

app.post('/api/token/rtc', function(request, response) {
	const duration = 3600;
	const timestamp = Math.floor(Date.now() / 1000);
	const expirationTime = timestamp + duration;
	const uid = request.uid || timestamp;
	const role = RtcRole.PUBLISHER;
	const token = RtcTokenBuilder.buildTokenWithUid(environment.appKey, environment.appCertificate, environment.channelName, uid, role, expirationTime);
	console.log('/api/token/rtc', token);
	response.send(JSON.stringify({
		token: token,
	}));
});

app.post('/api/token/rtm', function(request, response) {
	const duration = 3600;
	const timestamp = Math.floor(Date.now() / 1000);
	const expirationTime = timestamp + duration;
	const uid = request.uid || timestamp;
	const role = RtmRole.PUBLISHER;
	const token = RtmTokenBuilder.buildTokenWithUid(environment.appKey, environment.appCertificate, environment.channelName, uid, role, expirationTime);
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
