'use strict'
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const config = require('config');
const app = express();

app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var players = {},
initState = {
		isPlaying: false,
		num: 0,
};

const APP_SECRET = process.env.APP_SECRET ? process.env.APP_SECRET :
	config.get("appSecret");
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_TOKEN ? process.env.FACEBOOK_TOKEN :
	config.get("pageAccessToken");
const VALIDATION_TOKEN = process.env.VALIDATION_TOKEN ? process.env.VALIDATION_TOKEN :
	config.get("validationToken");

//const APP_SECRET = process.env.APP_SECRET;
//const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_TOKEN;
//const VALIDATION_TOKEN = process.env.VALIDATION_TOKEN;

//if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
//	console.error("Missing config values");
//	process.exit(1);
//}

//var pgp = require("pg-promise")(/*options*/);
//var db = pgp(process.env.DATABASE_URL);

app.get('/', function(req, res) {
	console.log("Hello world");
	res.send('Hello world');
})
app.get('/webhook', function(req, res) {
	if (req.query['hub.verify_token'] === VALIDATION_TOKEN) {
		res.send(req.query['hub.challenge']);
	}
	res.send('Error, wrong token');
})
app.post("/webhook", function(req, res) {
	console.log("WEBHOOK GET IT WORKS");
	var data = req.body;
	console.log(data);
	// Make sure this is a page subscription
	if (data.object == 'page') {
		// Iterate over each entry
		// There may be multiple if batched
		data.entry.forEach(function(pageEntry) {
			var pageID = pageEntry.id;
			var timeOfEvent = pageEntry.time;
			// Iterate over each messaging event
			pageEntry.messaging.forEach(function(messagingEvent) {
				if (messagingEvent.optin) {
					receivedAuthentication(messagingEvent);
				} else if (messagingEvent.message) {
					receivedMessage(messagingEvent);
				} else if (messagingEvent.postback) {
					receivedPostback(messagingEvent);
				} else {
					console.log("Webhook received unknown messagingEvent: ", messagingEvent);
				}
			});
		});
		res.sendStatus(200);
	}
});
function receivedMessage(event) {
	var senderId = event.sender.id;
	var content = event.message.text;
	var echo_message = "ECHO : " + content;
	sendTextMessage(senderId, echo_message);
}
function receivedPostback(event) {
	console.log("RECEIVED POSTBACK IT WORKS");
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfPostback = event.timestamp;
	var payload = event.postback.payload;
	console.log("Received postback for user %d and page %d with payload '%s' " +
		"at %d", senderID, recipientID, payload, timeOfPostback);
	sendTextMessage(senderID, "Postback called");
}
function sendTextMessage(recipientId, message) {
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: PAGE_ACCESS_TOKEN },
		method: 'POST',
		json: {
			recipient: { id: recipientId },
			message: { text: message }
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending message: ' + response.error);
		}
	});
}
function receivedAuthentication(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfAuth = event.timestamp;

	// The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
	// The developer can set this to an arbitrary value to associate the
	// authentication callback with the 'Send to Messenger' click event. This is
	// a way to do account linking when the user clicks the 'Send to Messenger'
	// plugin.
	var passThroughParam = event.optin.ref;

	console.log("Received authentication for user %d and page %d with pass " +
		"through param '%s' at %d", senderID, recipientID, passThroughParam,
		timeOfAuth);

	// When an authentication is received, we'll send a message back to the sender
	// to let them know it was successful.
	sendTextMessage(senderID, "Authentication successful");
	}

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'));
})