var async = require('async'),

	Backend = require('./backend'),
	Config = require('./config'),

	NodeBB = require('./nodebb'),
	SocketIndex = NodeBB.socketIndex;

var Sockets = {
	load: function(socket, data, callback) {
		var allowAnon = Config.settings.get('toggles.allowAnon');
		if (socket.uid || allowAnon) {
			if (data && data.pollid) {
				data.uid = socket.uid;
				data.anon = (!socket.uid && allowAnon);
				Backend.getPoll(data, function(err, result) {
					if (parseInt(result.info.deleted, 10) === 1 || parseInt(result.info.ended, 10) === 1) {
						callback(new Error('Poll unavailable'));
					} else {
						callback(null, result);
					}
				});
			} else {
				callback(new Error('Invalid poll request'));
			}
		} else {
			callback(new Error('Not logged in'));
		}
	},
	vote: function(socket, data, callback) {
		if (socket.uid && data && data.pollid && !isNaN(parseInt(data.pollid)) &&
			data.options && data.options.length > 0) {
			data.uid = socket.uid;
			async.parallel({
				canvote: function(next) {
					Backend.canVote(data, next);
				},
				optionsFilter: function(next) {
					Backend.pollHasOptions(data.pollid, data.options, next);
				},
				settings: function(next) {
					Backend.getPollSettings(data.pollid, next);
				}
			}, function(err, result) {
				//Filter the options on their existance, then slice out the max allowed votes
				data.options = data.options.filter(function(el, index) {
					return result.optionsFilter[index];
				}).slice(0, result.settings.maxvotes);

				if (!err && (result.canvote && data.options.length > 0)) {
					Backend.addVote(data, function(err, result) {
						result.pollid = data.pollid;
						SocketIndex.server.sockets.emit('event:poll.votechange', result);
						callback();
					});
				} else {
					callback(new Error('Already voted or invalid option'));
				}
			});
		} else {
			callback(new Error('Invalid vote'));
		}
	}
};

module.exports = Sockets;