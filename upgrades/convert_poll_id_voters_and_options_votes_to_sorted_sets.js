
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

					Poll.getOptions(pollId, false, function (err, options) {
						if (err) {
							return next(err);
						}
						async.parallel([
							function (next) {
								console.log("deleteObjectField", pollKey, "voteCount");
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
									console.log("delete", pollVotersSetKey);
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
									console.log("option");
									console.log(option);

									var pollOptionsVotesSetKey = 'poll:' + pollId + ':options:' + option + ':votes';
									var pollOptionsSetKey = 'poll:' + pollId + ':options:' + option;

									async.parallel([
										function (next) {
											NodeBB.db.getSetMembers(pollOptionsVotesSetKey, function(err, optionVotesUids) {
												if (err) {
													return next(err);
												}
												if (!Array.isArray(optionVotesUids) || !optionVotesUids.length) {
													return next();
												}
												console.log("delete", pollOptionsVotesSetKey);
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
											console.log("deleteObjectField", pollOptionsSetKey, "voteCount");
											NodeBB.db.deleteObjectField(pollOptionsSetKey, 'voteCount', next);
										}
									], next);

								}, next);
							}
						], next);
					});
				},
				function (err) {
					console.log("upgrade done");
					callback(err)
				});
		});
	}
};
