"use strict";

var async = require('async'),

	NodeBB = require('./nodebb'),

	Config = require('./config'),
	Poll = require('./poll'),
	Vote = require('./vote');

(function(Sockets) {

	Sockets.load = function(socket, data, callback) {
		var allowAnon = Config.settings.get('toggles.allowAnon');

		if (!socket.uid && !allowAnon) {
			return callback(new Error('Not logged in'));
		}

		if (!data || !data.pollid) {
			return callback(new Error('Invalid poll request'));
		}

		data.uid = socket.uid;
		data.anon = (!socket.uid && allowAnon);

		Poll.get(data, function(err, result) {
			callback(err, result);
		});
	};

	Sockets.vote = function(socket, data, callback) {
		if (!socket.uid || !data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
			return callback(new Error('Invalid vote'));
		}

		data.uid = socket.uid;

		async.parallel({
			canVote: function(next) {
				Vote.canVote(data.uid, data.pollId, next);
			},
			optionsFilter: function(next) {
				Poll.hasOptions(data.pollid, data.options, next);
			},
			settings: function(next) {
				Poll.getSettings(data.pollid, next);
			}
		}, function(err, result) {
			// Filter the options on their existence
			data.options = data.options.filter(function(el, index) {
				return result.optionsFilter[index];
			});

			// Give an error if there are too many votes
			if (data.options.length > parseInt(result.settings.maxvotes, 10)) {
				return callback(new Error('You can only vote for ' + result.settings.maxvotes + ' options on this poll.'));
			}

			if (err || !result.canVote || !data.options.length) {
				return callback(new Error('Already voted or invalid option'));

			}

			Vote.add(data, function(err, result) {
				result.pollId = data.pollId;

				NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', result);

				callback();
			});
		});
	};

	Sockets.getOptionDetails = function(socket, data, callback) {
		if (!socket.uid || !data || isNaN(parseInt(data.pollId, 10)) || isNaN(parseInt(data.option, 10))) {
			return callback(new Error('Invalid request'));
		}

		Poll.getOption(data.pollid, data.option, true, function(err, result) {
			if (err) {
				return callback(new Error('Something went wrong!'));
			}

			if (!result.votes || !result.votes.length) {
				return callback(null, result);
			}

			NodeBB.User.getMultipleUserFields(result.votes, ['username', 'userslug', 'picture'], function(err, userData) {
				result.votes = userData;
				callback(null, result);
			})
		});
	};

	Sockets.getConfig = function(socket, data, callback) {
		callback(null, Config.settings.get());
	};

})(exports);