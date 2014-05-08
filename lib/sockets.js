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
				Backend.getPoll(data, callback);
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
			async.parallel([function(next) {
				Backend.hasUidVoted(data.uid, data.pollid, next);
			}, function(next) {
				Backend.pollHasOptions(data.pollid, data.options, next);
			}], function(err, result) {
				data.options.filter(function(el, index) {
					return result[1][index];
				});
				if (!err && (!result[0] && data.options.length > 0)) {
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