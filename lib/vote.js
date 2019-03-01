"use strict";

var async = require('async'),

	NodeBB = require('./nodebb'),

	Poll = require('./poll');

(function(Vote) {

	Vote.add = function(voteData, callback) {
		var pollId = voteData.pollId,
			options = voteData.options,
			uid = voteData.uid,
			timestamp = +new Date;

		async.parallel([
			function(next) {
				async.each(options, function(option, next) {
					// Add uid to list of votes
					NodeBB.db.sortedSetAdd('poll:' + pollId + ':options:' + option + ':votes', timestamp, uid, next);
				}, next);
			},
			function(next) {
				NodeBB.db.sortedSetAdd('poll:' + pollId + ':voters', timestamp, uid, next);
			}
		], function(err) {
			if (err) {
				return callback(err, false);
			}

			callback(null, true);
		});
	};

	Vote.remove = function(voteData, callback) {
		var pollId = voteData.pollId,
			options = voteData.options,
			uid = voteData.uid;

		async.parallel([
			function(next) {
				async.each(options, function(option, next) {
					NodeBB.db.sortedSetRemove('poll:' + pollId + ':options:' + option + ':votes', uid, next);
				}, next);
			},
			function(next) {
				NodeBB.db.sortedSetRemove('poll:' + pollId + ':voters', uid, next);
			}
		], function(err) {
			if (err) {
				return callback(err, false);
			}

			callback(null, true);
		});
	};

	Vote.update = function (voteData, callback) {
		// todo: yup?
		async.series([
			async.apply(Vote.remove, voteData),
			async.apply(Vote.add, voteData)
		], callback);
	};

	Vote.canUpdateVote = function(uid, pollId, callback) {
		async.parallel([
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
				Poll.allowsVoteUpdate(pollId, next);
			}
		], function(err, result) {
			callback(err, result.indexOf(true) === -1);
		});
	};

	Vote.canVote = function(uid, pollId, callback) {
		async.parallel([
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
		], function(err, result) {
			callback(err, result.indexOf(true) === -1);
		});
	};

	Vote.hasUidVoted = function(uid, pollId, callback) {
		NodeBB.db.sortedSetScore('poll:' + pollId + ':voters', uid, function (err, score) {
			callback(err, !!score)
		});
	};

	Vote.hasUidVotedOnOption = function(uid, pollId, option, callback) {
		NodeBB.db.sortedSetScore('poll:' + pollId + ':options:' + option + ':votes', uid, function (err, score) {
			callback(err, !!score)
		});
	};

})(exports);
