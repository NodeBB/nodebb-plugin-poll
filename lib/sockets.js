'use strict';

const async = require('async');

const NodeBB = require('./nodebb');

const Config = require('./config');
const Poll = require('./poll');
const Vote = require('./vote');

(function (Sockets) {
	Sockets.getConfig = function (socket, data, callback) {
		callback(null, Config.settings.get());
	};

	Sockets.get = function (socket, data, callback) {
		const allowAnon = Config.settings.get('toggles.allowAnon');

		if (!data) {
			return callback(new Error('Invalid request, request data is not defined'));
		}
		if (isNaN(parseInt(data.pollId, 10))) {
			return callback(new Error('Invalid request, pollId is required'));
		}
		if ((!socket.uid && !allowAnon)) {
			return callback(new Error('Invalid request, anonymous access is not allowed'));
		}

		const pollId = parseInt(data.pollId, 10);
		Poll.get(pollId, socket.uid, !!socket.uid, (err, pollData) => {
			if (err) {
				console.error(err);
			}
			if (!pollData.info.version) {
				return callback(new Error('Legacy polls are not supported'));
			}

			pollData.optionType = parseInt(pollData.settings.maxvotes, 10) > 1 ? 'checkbox' : 'radio';

			return callback(null, pollData);
		});
	};

	Sockets.vote = function (socket, data, callback) {
		if (!socket.uid) {
			return callback(new Error('You need to be logged in to vote'));
		}
		if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
			return callback(new Error('Invalid vote'));
		}

		data.uid = socket.uid;

		async.parallel({
			canVote: function (next) {
				Vote.canVote(data.uid, data.pollId, next);
			},
			optionsFilter: function (next) {
				Poll.hasOptions(data.pollId, data.options, next);
			},
			settings: function (next) {
				Poll.getSettings(data.pollId, next);
			},
		}, (err, result) => {
			// Filter the options on their existence
			data.options = data.options.filter((el, index) => result.optionsFilter[index]);

			// Give an error if there are too many votes
			if (data.options.length > parseInt(result.settings.maxvotes, 10)) {
				return callback(new Error(`You can only vote for ${result.settings.maxvotes} options on this poll.`));
			}

			if (err || !result.canVote || !data.options.length) {
				return callback(new Error('Already voted or invalid option'));
			}

			Vote.add(data, (err) => {
				if (err) {
					return callback(new Error('Error during voting'));
				}

				Poll.get(data.pollId, socket.uid, false, (err, pollData) => {
					if (err) {
						console.error(err);
					}

					NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);

					callback();
				});
			});
		});
	};

	Sockets.updateVote = function (socket, data, callback) {
		if (!socket.uid) {
			return callback(new Error('You need to be logged in to make changes'));
		}
		if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
			return callback(new Error('Invalid vote'));
		}
		data.uid = socket.uid;

		async.parallel({
			canUpdateVote: function (next) {
				Vote.canUpdateVote(data.uid, data.pollId, next);
			},
			optionsFilter: function (next) {
				Poll.hasOptions(data.pollId, data.options, next);
			},
			settings: function (next) {
				Poll.getSettings(data.pollId, next);
			},
		}, (err, result) => {
			// Filter the options on their existence
			data.options = data.options.filter((el, index) => result.optionsFilter[index]);

			// Give an error if there are too many votes
			if (data.options.length > parseInt(result.settings.maxvotes, 10)) {
				return callback(new Error(`You can only vote for ${result.settings.maxvotes} options on this poll.`));
			}
			if (!result.canUpdateVote) {
				return callback(new Error('Can\'t update vote'));
			}
			if (err || !data.options.length) {
				if (err) {
					console.error(err);
				}
				return callback(new Error('Invalid option'));
			}

			Vote.update(data, (err) => {
				if (err) {
					return callback(new Error('Error during updating vote'));
				}

				Poll.get(data.pollId, socket.uid, false, (err, pollData) => {
					if (err) {
						console.error(err);
					}

					NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);

					callback();
				});
			});
		});
	};

	Sockets.removeVote = function (socket, data, callback) {
		if (!socket.uid) {
			return callback(new Error('You need to be logged in to make changes'));
		}
		if (!data || isNaN(parseInt(data.pollId, 10))) {
			return callback(new Error('Invalid request'));
		}
		data.uid = socket.uid;

		async.parallel({
			canUpdateVote: function (next) {
				Vote.canUpdateVote(data.uid, data.pollId, next);
			},
		}, (err, result) => {
			if (!result.canUpdateVote) {
				return callback(new Error('Can\'t remove vote'));
			}
			if (err) {
				console.error(err);
				return callback(new Error('Something went wrong'));
			}
			Vote.remove(data, (err) => {
				if (err) {
					return callback(new Error('Error during removing vote'));
				}
				Poll.get(data.pollId, socket.uid, false, (err, pollData) => {
					if (err) {
						console.error(err);
					}

					NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);
					callback();
				});
			});
		});
	};

	Sockets.getOptionDetails = function (socket, data, callback) {
		if (!socket.uid || !data || isNaN(parseInt(data.pollId, 10)) || isNaN(parseInt(data.optionId, 10))) {
			return callback(new Error('Invalid request'));
		}

		Poll.getOption(data.pollId, data.optionId, true, (err, result) => {
			if (err) {
				return callback(new Error('Something went wrong!'));
			}

			if (!result.votes || !result.votes.length) {
				return callback(null, result);
			}

			NodeBB.User.getUsersFields(result.votes, ['uid', 'username', 'userslug', 'picture'], (err, userData) => {
				if (err) {
					console.error(err);
				}
				result.votes = userData;
				callback(null, result);
			});
		});
	};

	Sockets.canCreate = function (socket, data, callback) {
		if (!socket.uid || !data || (isNaN(parseInt(data.cid, 10)) && isNaN(parseInt(data.pid, 10)))) {
			return callback(new Error('Invalid request'));
		}

		if (!data.cid) {
			async.waterfall([
				function (next) {
					NodeBB.Posts.getPostField(data.pid, 'tid', next);
				},
				function (tid, next) {
					NodeBB.Topics.getTopicField(tid, 'cid', (err, cid) => {
						if (err) {
							console.error(err);
							return callback(new Error('Invalid request'));
						}
						next(null, cid);
					});
				},
				function (cid) {
					checkPrivs(cid, socket.uid, callback);
				},
			]);
		} else {
			checkPrivs(data.cid, socket.uid, callback);
		}
	};

	function checkPrivs(cid, socketUid, callback) {
		NodeBB.Privileges.categories.can('poll:create', cid, socketUid, (err, can) => {
			if (err || !can) {
				return callback(new Error('[[poll:error.privilege.create]]'), can);
			}
			return callback(null, can);
		});
	}
}(exports));
