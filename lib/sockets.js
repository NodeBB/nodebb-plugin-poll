var async = require('async'),

	Backend = require('./backend'),
	Config = require('./config'),

	NodeBB = require('./nodebb'),
	SocketIndex = NodeBB.socketIndex,
	User = NodeBB.user;

var Sockets = {
	load: function(socket, data, callback) {
		var allowAnon = Config.settings.get('toggles.allowAnon');
		if (socket.uid || allowAnon) {
			if (data && data.pollid) {
				data.uid = socket.uid;
				data.anon = (!socket.uid && allowAnon);
				Backend.getPoll(data, function(err, result) {
					callback(err, result);
				});
			} else {
				callback(new Error('Invalid poll request'));
			}
		} else {
			callback(new Error('Not logged in'));
		}
	},
	vote: function(socket, data, callback) {
		if (socket.uid && data && !isNaN(parseInt(data.pollid, 10)) && data.options && data.options.length > 0) {
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
				//Filter the options on their existence, then slice out the max allowed votes
				data.options = data.options.filter(function(el, index) {
					return result.optionsFilter[index];
				})/*.slice(0, result.settings.maxvotes);*/

				//Instead of slicing we'll give them an error
				if (data.options.length > parseInt(result.settings.maxvotes, 10)) {
					callback(new Error('You can only vote for ' + result.settings.maxvotes + ' options on this poll!'));
				} else {
					if (!err && (result.canvote && data.options.length > 0)) {
						Backend.addVote(data, function(err, result) {
							result.pollid = data.pollid;
							SocketIndex.server.sockets.emit('event:poll.votechange', result);
							callback();
						});
					} else {
						callback(new Error('Already voted or invalid option'));
					}
				}
			});
		} else {
			callback(new Error('Invalid vote'));
		}
	},
	optionDetails: function(socket, data, callback) {
		if (socket.uid && data && !isNaN(parseInt(data.pollid, 10)) && !isNaN(parseInt(data.option, 10))) {
			Backend.getPollOption(data.pollid, data.option, true, function(err, result) {
				if (err) {
					callback(new Error('Something went wrong!'));
				} else if (result.votes && result.votes.length > 0) {
					User.getMultipleUserFields(result.votes, ['username', 'userslug', 'picture'], function(err, userData) {
						result.votes = userData;
						callback(null, result);
					})
				} else {
					callback(null, result);
				}
			});
		} else {
			callback(new Error('Invalid request'));
		}
	}
};

module.exports = Sockets;