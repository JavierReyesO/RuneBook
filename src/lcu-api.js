const WebSocket = require('ws');
const request = require('request');

var ws = null;
var conn_data = null;

function bind(data) {
	conn_data = data;
	ws = new WebSocket(`wss://${data.username}:${data.password}@${data.address}:${data.port}/`, "wamp", {
		rejectUnauthorized: false,
	});

	ws.on('error', (err) => {
		console.log(err);
		if (err.message.includes('ECONNREFUSED')) {
			destroy();
			setTimeout(function () {
				bind(data);
			}, 1000);
		}
	});

	ws.on('message', (msg) => {
		var res;
		try {
			res = JSON.parse(msg);
		} catch(e) {
			console.log(e);
		}
		if(res[0] === 0) {
			console.log("connected", res);
			freezer.emit(`api:connected`);
		}
		if(res[1] == "OnJsonApiEvent") {
			var evt = res[2];
			//console.log(`${evt.uri}:${evt.eventType}`);
			freezer.emit(`${evt.uri}:${evt.eventType}`, evt.data);
		}
	});

	ws.on('open', () => {
		ws.send('[5, "OnJsonApiEvent"]');
	});
}

function destroy() {
	ws.removeEventListener()
	ws = null;
}

var methods = {};
["post", "put", "get", "del"].forEach(function(method) {
	methods[method] = function(endpoint, body) {
		return new Promise(resolve => {	
			var options = {
				url: `${conn_data.protocol}://${conn_data.address}:${conn_data.port}${endpoint}`,
				auth: {
					"pass": conn_data.password,
					"user": conn_data.username
				},
				headers: {
					'Accept': 'application/json'
				},
				json: true,
				body: body,
				rejectUnauthorized: false
			};

			request[method](options, (error, response, data) => {
				if (error || response.statusCode != 200) {
					resolve();
					return;
				}

				resolve(data);
			});
		});
	};
});

module.exports = Object.assign({bind, destroy}, methods);
