
var async = require.main.require('async');
var NodeBB = require('../lib/nodebb');
var Poll = require('../lib/poll');
var timestamp = Date.UTC(2019, 3, 1);

module.exports = {
	name: 'Convert all poll id votes and options votes to sorted sets',
	timestamp: timestamp,
	method: function (callback) {
		NodeBB.db.getListRange('polls', 0, -1, function (err, pollIds) {
			async.eachLimit(pollIds, 10,
				function (pollId, next) {
					var pollKey = 'poll:' + pollId;
					var pollVotersSetKey = 'poll:' + pollId + ':voters';

					NodeBB.db.getObjectField(pollKey, 'voteCount', function (err, value) {
						if (value == null) {
							return next();
						}
						Poll.getOptions(pollId, false, function (err, options) {
							if (err) {
								return next(err);
							}
							async.parallel([
								function (next) {
									NodeBB.db.deleteObjectField(pollKey, 'voteCount', next);
								},
								function (next) {
									NodeBB.db.getSetMembers(pollVotersSetKey, function(err, votersUids) {
										if (err) {
											return next(err);
										}
										if (!Array.isArray(votersUids) || !votersUids.length) {
											return next();
										}
										NodeBB.db.delete(pollVotersSetKey, function(err) {
											if (err) {
												return next(err);
											}
											async.eachSeries(votersUids, function(uid, next) {
												NodeBB.db.sortedSetAdd(pollVotersSetKey, timestamp, uid, next);
											}, next);
										});
									});
								},
								function (next) {
									async.each(options, function (option, next) {
										var pollOptionsVotesSetKey = 'poll:' + pollId + ':options:' + option.id + ':votes';
										var pollOptionsSetKey = 'poll:' + pollId + ':options:' + option.id;

										async.parallel([
											function (next) {
												NodeBB.db.getSetMembers(pollOptionsVotesSetKey, function(err, optionVotesUids) {
													if (err) {
														return next(err);
													}
													if (!Array.isArray(optionVotesUids) || !optionVotesUids.length) {
														return next();
													}
													NodeBB.db.delete(pollOptionsVotesSetKey, function(err) {
														if (err) {
															return next(err);
														}

														async.eachSeries(optionVotesUids, function(uid, next) {
															NodeBB.db.sortedSetAdd(pollOptionsVotesSetKey, timestamp, uid, next);
														}, next);
													});
												});
											},
											function (next) {
												NodeBB.db.deleteObjectField(pollOptionsSetKey, 'voteCount', next);
											}
										], next);

									}, next);
								}
							], next);
						});
					});
				},
				callback);
		});
	}
};
