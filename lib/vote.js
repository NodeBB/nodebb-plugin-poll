'use strict';

var async = require('async'),
	NodeBB = require('./nodebb'),
	Poll = require('./poll');

(function(Vote) {
	Vote.add = function(voteData, callback) {
		var pollId = voteData.pollId,
			options = voteData.options,
			uid = voteData.uid,
			timestamp = Date.now(),
			preferences = Object.assign({}, voteData.preferences, { uid: uid });

		async.parallel(
			[
				function(next) {
					async.each(
						options,
						function(option, callback) {
							async.parallel(
								[
									function(next) {
										// Add uid to list of votes
										NodeBB.db.sortedSetAdd('poll:' + pollId + ':options:' + option + ':votes', timestamp, uid, next);
									},
									function(next) {
										NodeBB.db.setObject(
											'poll:' + pollId + ':options:' + option + ':preferences:' + uid,
											preferences,
											next
										);
									}
								],
								callback
							);
						},
						next
					);
				},
				function(next) {
					NodeBB.db.sortedSetAdd('poll:' + pollId + ':voters', timestamp, uid, next);
				}
			],
			function(err) {
				if (err) {
					return callback(err, false);
				}

				callback(null, true);
			}
		);
	};

	Vote.remove = function(voteData, callback) {
		return Vote.removeUidVote(voteData.uid, voteData.pollId, callback);
	};

	Vote.get = function(voteData, callback) {
		return Vote.getUidVote(voteData.uid, voteData.pollId, callback);
	};

	Vote.removeUidVote = function(uid, pollId, callback) {
		Vote.getUidVote(uid, pollId, function(voteErr, vote) {
			async.parallel(
				[
					function(next) {
						async.each(
							vote.options || [],
							function(option, callback) {
								async.parallel(
									[
										function(next) {
											NodeBB.db.sortedSetRemove('poll:' + pollId + ':options:' + option + ':votes', uid, next);
										},
										function(next) {
											NodeBB.db.delete('poll:' + pollId + ':options:' + option + ':preferences:' + uid, next);
										}
									],
									callback
								);
							},
							next
						);
					},
					function(next) {
						NodeBB.db.sortedSetRemove('poll:' + pollId + ':voters', uid, next);
					}
				],
				function(err) {
					if (voteErr) {
						return callback(voteErr);
					}
					if (err) {
						return callback(err);
					}

					callback(null);
				}
			);
		});
	};

	Vote.getUidVote = function(uid, pollId, callback) {
		Poll.getOptions(pollId, true, function(err, options) {
			callback(err, {
				pollId: pollId,
				uid: uid,
				options: options.filter(option => option.votes.some(_uid => _uid == uid)).map(option => option.id)
			});
		});
	};

	Vote.update = function(voteData, callback) {
		async.series(
			[
				function(next) {
					Vote.remove(voteData, next);
				},
				function(next) {
					Vote.add(voteData, next);
				}
			],
			callback
		);
	};

	Vote.canUpdateVote = function(uid, pollId, callback) {
		async.parallel(
			[
				function(next) {
					// Ended?
					Poll.hasEnded(pollId, next);
				},
				function(next) {
					// Deleted?
					Poll.isDeleted(pollId, next);
				},
				function(next) {
					// voteUpdate?
					Poll.doesDisallowVoteUpdate(pollId, next);
				}
			],
			function(err, result) {
				callback(err, result.indexOf(true) === -1);
			}
		);
	};

	Vote.canVote = function(uid, pollId, callback) {
		async.parallel(
			[
				function(next) {
					// Ended?
					Poll.hasEnded(pollId, next);
				},
				function(next) {
					// Deleted?
					Poll.isDeleted(pollId, next);
				},
				function(next) {
					// Already voted?
					Vote.hasUidVoted(uid, pollId, next);
				}
			],
			function(err, result) {
				callback(err, result.indexOf(true) === -1);
			}
		);
	};

	Vote.hasUidVoted = function(uid, pollId, callback) {
		NodeBB.db.sortedSetScore('poll:' + pollId + ':voters', uid, function(err, score) {
			callback(err, !!score);
		});
	};

	Vote.hasUidVotedOnOption = function(uid, pollId, option, callback) {
		NodeBB.db.sortedSetScore('poll:' + pollId + ':options:' + option + ':votes', uid, function(err, score) {
			callback(err, !!score);
		});
	};
})(exports);
