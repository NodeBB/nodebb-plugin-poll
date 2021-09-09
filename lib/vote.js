'use strict';

const async = require('async');
const NodeBB = require('./nodebb');
const Poll = require('./poll');

(function (Vote) {
	Vote.add = function (voteData, callback) {
		const { pollId } = voteData;
		const { options } = voteData;
		const { uid } = voteData;
		const timestamp = +new Date();

		async.parallel([
			function (next) {
				async.each(options, (option, next) => {
					// Add uid to list of votes
					NodeBB.db.sortedSetAdd(`poll:${pollId}:options:${option}:votes`, timestamp, uid, next);
				}, next);
			},
			function (next) {
				NodeBB.db.sortedSetAdd(`poll:${pollId}:voters`, timestamp, uid, next);
			},
		], (err) => {
			if (err) {
				return callback(err, false);
			}

			callback(null, true);
		});
	};

	Vote.remove = function (voteData, callback) {
		return Vote.removeUidVote(voteData.uid, voteData.pollId, callback);
	};

	Vote.get = function (voteData, callback) {
		return Vote.getUidVote(voteData.uid, voteData.pollId, callback);
	};

	Vote.removeUidVote = function (uid, pollId, callback) {
		Vote.getUidVote(uid, pollId, (err, vote) => {
			if (err) {
				console.error(err);
			}

			async.parallel([
				function (next) {
					async.each(vote.options || [], (option, next) => {
						NodeBB.db.sortedSetRemove(`poll:${pollId}:options:${option}:votes`, uid, next);
					}, next);
				},
				function (next) {
					NodeBB.db.sortedSetRemove(`poll:${pollId}:voters`, uid, next);
				},
			], (err) => {
				if (err) {
					return callback(err, false);
				}

				callback(null, true);
			});
		});
	};

	Vote.getUidVote = function (uid, pollId, callback) {
		Poll.getOptions(pollId, true, (err, options) => {
			callback(err, {
				pollId: pollId,
				uid: uid,
				options: options
					.filter(option => option.votes.some(_uid => parseInt(_uid, 10) === parseInt(uid, 10)))
					.map(option => option.id),
			});
		});
	};

	Vote.update = function (voteData, callback) {
		async.series([
			function (next) {
				Vote.remove(voteData, next);
			},
			function (next) {
				Vote.add(voteData, next);
			},
		], callback);
	};

	Vote.canUpdateVote = function (uid, pollId, callback) {
		async.parallel([
			function (next) {
				// Ended?
				Poll.hasEnded(pollId, next);
			},
			function (next) {
				// Deleted?
				Poll.isDeleted(pollId, next);
			},
			function (next) {
				// voteUpdate?
				Poll.doesDisallowVoteUpdate(pollId, next);
			},
		], (err, result) => {
			callback(err, result.indexOf(true) === -1);
		});
	};

	Vote.canVote = function (uid, pollId, callback) {
		async.parallel([
			function (next) {
				// Ended?
				Poll.hasEnded(pollId, next);
			},
			function (next) {
				// Deleted?
				Poll.isDeleted(pollId, next);
			},
			function (next) {
				// Already voted?
				Vote.hasUidVoted(uid, pollId, next);
			},
		], (err, result) => {
			callback(err, result.indexOf(true) === -1);
		});
	};

	Vote.hasUidVoted = function (uid, pollId, callback) {
		NodeBB.db.sortedSetScore(`poll:${pollId}:voters`, uid, (err, score) => {
			callback(err, !!score);
		});
	};

	Vote.hasUidVotedOnOption = function (uid, pollId, option, callback) {
		NodeBB.db.sortedSetScore(`poll:${pollId}:options:${option}:votes`, uid, (err, score) => {
			callback(err, !!score);
		});
	};
}(exports));
