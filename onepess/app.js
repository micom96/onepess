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

	if (content === 'choose') {
		sendGenericMessage(senderId);
	} else {
		var echo_message = "ECHO : " + content;
		sendTextMessage(senderId, echo_message);
	}
}
function receivedPostback(event) {
	console.log("RECEIVED POSTBACK IT WORKS");
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfPostback = event.timestamp;
	var payload = event.postback.payload;
	console.log("Received postback for user %d and page %d with payload '%s' " +
		"at %d", senderID, recipientID, payload, timeOfPostback);

	if (payload === "SITE_LIST_PAYLOAD") {
		// send list
		sendList(recipientId);
	} else if (payload === "NEW_SITE_PAYLOAD") {
		// register form
	} else {
		sendTextMessage(senderID, "Postback called");
	}
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

function sendList(recipientId) {
	var messageData = {
		recipient: {
		id: recipientId
		},
		message: {
		attachment: {
			type: "template",
			payload: {
			template_type: "list",
			elements: [{
				title: "rift",
				subtitle: "Next-generation virtual reality",
				item_url: "https://www.oculus.com/en-us/rift/",
				image_url: "http://messengerdemo.parseapp.com/img/rift.png",
				buttons: [{
				type: "web_url",
				url: "https://www.oculus.com/en-us/rift/",
				title: "Open Web URL"
				}, {
				type: "postback",
				title: "Call Postback",
				payload: "Payload for first bubble",
				}],
			}, {
				title: "touch",
				subtitle: "Your Hands, Now in VR",
				item_url: "https://www.oculus.com/en-us/touch/",
				image_url: "http://messengerdemo.parseapp.com/img/touch.png",
				buttons: [{
				type: "web_url",
				url: "https://www.oculus.com/en-us/touch/",
				title: "Open Web URL"
				}, {
				type: "postback",
				title: "Call Postback",
				payload: "Payload for second bubble",
				}]
			}]
			}
		}
		}
	};

	callSendAPI(messageData);
	}


function sendGenericMessage(recipientId) {
	var messageData = {
		recipient: {
		id: recipientId
		},
		message: {
		attachment: {
			type: "template",
			payload: {
			template_type: "generic",
			elements: [{
				title: "rift",
				subtitle: "Next-generation virtual reality",
				item_url: "https://www.oculus.com/en-us/rift/",
				image_url: "http://messengerdemo.parseapp.com/img/rift.png",
				buttons: [{
				type: "web_url",
				url: "https://www.oculus.com/en-us/rift/",
				title: "Open Web URL"
				}, {
				type: "postback",
				title: "Call Postback",
				payload: "Payload for first bubble",
				}],
			}, {
				title: "touch",
				subtitle: "Your Hands, Now in VR",
				item_url: "https://www.oculus.com/en-us/touch/",
				image_url: "http://messengerdemo.parseapp.com/img/touch.png",
				buttons: [{
				type: "web_url",
				url: "https://www.oculus.com/en-us/touch/",
				title: "Open Web URL"
				}, {
				type: "postback",
				title: "Call Postback",
				payload: "Payload for second bubble",
				}]
			}]
			}
		}
		}
	};

	callSendAPI(messageData);
	}

function callSendAPI(messageData) {
	request({
		uri: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: PAGE_ACCESS_TOKEN },
		method: 'POST',
		json: messageData

	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
		var recipientId = body.recipient_id;
		var messageId = body.message_id;

		if (messageId) {
			console.log("Successfully sent message with id %s to recipient %s",
			messageId, recipientId);
		} else {
		console.log("Successfully called Send API for recipient %s",
			recipientId);
		}
		} else {
		console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
		}
	});
	}
/*
function receivedAuthentication(event) {
	console.log("RECEIVED AUTHENTICATION");

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
*/
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'));
})