'use strict';

var async = require('async'),
	NodeBB = require('./nodebb'),
	Config = require('./config'),
	Poll = require('./poll'),
	Vote = require('./vote');

(function(Sockets) {
	Sockets.getConfig = function(socket, data, callback) {
		callback(null, Config.settings.get());
	};

	Sockets.get = function(socket, data, callback) {
		var allowAnon = Config.settings.get('toggles.allowAnon');

		if (!data) {
			return callback(new Error('Invalid request, request data is not defined'));
		}
		if (isNaN(parseInt(data.pollId, 10))) {
			return callback(new Error('Invalid request, pollId is required'));
		}
		if (!socket.uid && !allowAnon) {
			return callback(new Error('Invalid request, anonymous access is not allowed'));
		}

		var pollId = parseInt(data.pollId, 10);
		Poll.get(pollId, socket.uid, !!socket.uid, function(err, pollData) {
			if (!pollData.info.version) {
				return callback(new Error('Legacy polls are not supported'));
			}

			pollData.optionType = parseInt(pollData.settings.maxvotes, 10) > 1 ? 'checkbox' : 'radio';

			return callback(null, pollData);
		});
	};

	Sockets.vote = function(socket, data, callback) {
		if (!socket.uid) {
			return callback(new Error('You need to be logged in to vote'));
		}
		if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
			return callback(new Error('Invalid vote'));
		}

		data.uid = socket.uid;

		async.parallel(
			{
				canVote: function(next) {
					Vote.canVote(data.uid, data.pollId, next);
				},
				optionsFilter: function(next) {
					Poll.hasOptions(data.pollId, data.options, next);
				},
				settings: function(next) {
					Poll.getSettings(data.pollId, next);
				}
			},
			function(err, result) {
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

				Vote.add(data, function(err) {
					if (err) {
						return callback(new Error('Error during voting'));
					}

					Poll.get(data.pollId, socket.uid, false, function(err, pollData) {
						NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);

						callback();
					});
				});
			}
		);
	};

	Sockets.updateVote = function(socket, data, callback) {
		if (!socket.uid) {
			return callback(new Error('You need to be logged in to make changes'));
		}
		if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
			return callback(new Error('Invalid vote'));
		}
		data.uid = socket.uid;

		async.parallel(
			{
				canUpdateVote: function(next) {
					Vote.canUpdateVote(data.uid, data.pollId, next);
				},
				optionsFilter: function(next) {
					Poll.hasOptions(data.pollId, data.options, next);
				},
				settings: function(next) {
					Poll.getSettings(data.pollId, next);
				}
			},
			function(err, result) {
				// Filter the options on their existence
				data.options = data.options.filter(function(el, index) {
					return result.optionsFilter[index];
				});

				// Give an error if there are too many votes
				if (data.options.length > parseInt(result.settings.maxvotes, 10)) {
					return callback(new Error('You can only vote for ' + result.settings.maxvotes + ' options on this poll.'));
				}
				if (!result.canUpdateVote) {
					return callback(new Error("Can't update vote"));
				}
				if (err || !data.options.length) {
					err && console.error(err);
					return callback(new Error('Invalid option'));
				}

				Vote.update(data, function(err) {
					if (err) {
						return callback(new Error('Error during updating vote'));
					}

					Poll.get(data.pollId, socket.uid, false, function(err, pollData) {
						NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);

						callback();
					});
				});
			}
		);
	};

	Sockets.removeVote = function(socket, data, callback) {
		if (!socket.uid) {
			return callback(new Error('You need to be logged in to make changes'));
		}
		if (!data || isNaN(parseInt(data.pollId, 10))) {
			return callback(new Error('Invalid request'));
		}
		data.uid = socket.uid;

		async.parallel(
			{
				canUpdateVote: function(next) {
					Vote.canUpdateVote(data.uid, data.pollId, next);
				}
			},
			function(err, result) {
				if (!result.canUpdateVote) {
					return callback(new Error("Can't remove vote"));
				}
				if (err) {
					console.error(err);
					return callback(new Error('Something went wrong'));
				}
				Vote.remove(data, function(err) {
					if (err) {
						return callback(new Error('Error during removing vote'));
					}
					Poll.get(data.pollId, socket.uid, false, function(err, pollData) {
						NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);
						callback();
					});
				});
			}
		);
	};

	Sockets.getOptionDetails = function(socket, data, callback) {
		if (!socket.uid || !data || isNaN(parseInt(data.pollId, 10)) || isNaN(parseInt(data.optionId, 10))) {
			return callback(new Error('Invalid request'));
		}

		Poll.getOption(data.pollId, data.optionId, true, function(err, result) {
			if (err) {
				return callback(new Error('Something went wrong!'));
			}

			if (!result.votes || !result.votes.length) {
				return callback(null, result);
			}

			async.parallel(
				{
					preferences: function(next) {
						Poll.getPreferences(data.pollId, result.votes, result.id, next);
					},
					users: function(next) {
						NodeBB.User.getUsersFields(result.votes, ['uid', 'username', 'userslug', 'picture'], next);
					}
				},
				function(err, usersPreferences) {
					if (err) {
						return callback(err);
					}

					var users = usersPreferences.users,
						preferences = usersPreferences.preferences;

					result.votes = users.map(function(user) {
						var isAnonymous = preferences.find(function(preference) {
							if (!preference) {
								return false;
							}
							return preference.anonymous && preference.uid === user.uid;
						});

						if (isAnonymous) {
							return Poll.ANONYMOUS_USER;
						} else {
							return user;
						}
					});

					callback(null, result);
				}
			);
		});
	};

	Sockets.canCreate = function(socket, data, callback) {
		if (!socket.uid || !data || (isNaN(parseInt(data.cid, 10)) && isNaN(parseInt(data.pid, 10)))) {
			return callback(new Error('Invalid request'));
		}

		if (!data.cid) {
			async.waterfall([
				function(next) {
					NodeBB.Posts.getPostField(data.pid, 'tid', next);
				},
				function(tid, next) {
					NodeBB.Topics.getTopicField(tid, 'cid', function(err, cid) {
						if (err) {
							console.error(err);
							return callback(new Error('Invalid request'));
						}
						next(null, cid);
					});
				},
				function(cid, next) {
					checkPrivs(cid, socket.uid, callback);
				}
			]);
		} else {
			checkPrivs(data.cid, socket.uid, callback);
		}
	};

	function checkPrivs(cid, socketUid, callback) {
		NodeBB.Privileges.categories.can('poll:create', cid, socketUid, function(err, can) {
			if (err || !can) {
				return callback(new Error('[[poll:error.privilege.create]]'), can);
			} else {
				return callback(null, can);
			}
		});
	}
})(exports);
