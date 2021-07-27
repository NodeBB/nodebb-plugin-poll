'use strict';

const async = require.main.require('async');
const NodeBB = require('../lib/nodebb');

const timestamp = Date.UTC(2019, 3, 1);

module.exports = {
	name: 'Convert all poll id votes and options votes to sorted sets',
	timestamp: timestamp,
	method: function (callback) {
		NodeBB.db.getListRange('polls', 0, -1, (err, pollIds) => {
			if (err) {
				return callback(err);
			}
			async.eachLimit(pollIds, 10, (pollId, next) => {
				const pollKey = `poll:${pollId}`;
				const pollVotersSetKey = `poll:${pollId}:voters`;

				NodeBB.db.getObjectField(pollKey, 'voteCount', (err, value) => {
					if (err) {
						return next(err);
					}
					if (value == null) {
						return next();
					}

					getOptions(pollId, (err, options) => {
						if (err) {
							return next(err);
						}
						async.parallel([
							function (next) {
								NodeBB.db.deleteObjectField(pollKey, 'voteCount', next);
							},
							function (next) {
								let votersUids;
								async.waterfall([
									function (_next) {
										NodeBB.db.type(pollVotersSetKey, _next);
									},
									function (type, _next) {
										if (type !== 'set') {
											return next();
										}
										NodeBB.db.getSetMembers(pollVotersSetKey, _next);
									},
									function (_votersUids, _next) {
										votersUids = _votersUids;
										if (!Array.isArray(votersUids) || !votersUids.length) {
											return next();
										}
										NodeBB.db.delete(pollVotersSetKey, _next);
									},
									function (_next) {
										NodeBB.db.sortedSetAdd(
											pollVotersSetKey,
											votersUids.map(() => timestamp),
											votersUids,
											_next
										);
									},
								], next);
							},
							function (next) {
								async.each(options, (option, next) => {
									const pollOptionsVotesSetKey = `poll:${pollId}:options:${option.id}:votes`;
									const pollOptionsSetKey = `poll:${pollId}:options:${option.id}`;

									async.parallel([
										function (next) {
											let optionVotesUids;
											async.waterfall([
												function (_next) {
													NodeBB.db.type(pollOptionsVotesSetKey, _next);
												},
												function (type, _next) {
													if (type !== 'set') {
														return next();
													}
													NodeBB.db.getSetMembers(pollOptionsVotesSetKey, _next);
												},
												function (_optionVotesUids, _next) {
													optionVotesUids = _optionVotesUids;
													if (!Array.isArray(optionVotesUids) || !optionVotesUids.length) {
														return next();
													}
													NodeBB.db.delete(pollOptionsVotesSetKey, _next);
												},
												function (_next) {
													NodeBB.db.sortedSetAdd(
														pollOptionsVotesSetKey,
														optionVotesUids.map(() => timestamp),
														optionVotesUids,
														_next
													);
												},
											], next);
										},
										function (next) {
											NodeBB.db.deleteObjectField(pollOptionsSetKey, 'voteCount', next);
										},
									], next);
								}, next);
							},
						], next);
					});
				});
			},
			callback);
		});
	},
};

function getOptions(pollId, callback) {
	NodeBB.db.getSetMembers(`poll:${pollId}:options`, (err, options) => {
		if (err) {
			return callback(err);
		}
		async.map(options, (option, next) => {
			NodeBB.db.getObject(`poll:${pollId}:options:${option}`, next);
		}, callback);
	});
}
