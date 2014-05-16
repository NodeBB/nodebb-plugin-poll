var NodeBB = require('./nodebb'),
	db = NodeBB.db,

	async = require('async');

//To whoever reads this
//Please help improve
var Backend = {
	addPoll: function(pollData, callback) {
		db.incrObjectField('global', 'nextPollid', function(err, pollid) {
			if (err) {
				return callback(err, -1);
			}

			//These are separately saved, so we need to remove them from the main poll data
			var pollOptions = pollData.options,
				pollSettings = pollData.settings;

			pollData.options = undefined;
			pollData.settings = undefined;
			pollData.pollid = pollid;

			//Build new pollData without the options and settings keys
			var poll = {};
			for (var p in pollData) {
				if (pollData.hasOwnProperty(p) && pollData[p] !== undefined) {
					poll[p] = pollData[p];
				}
			}

			//Save all the options to the database
			for(var i = 0, l = pollOptions.length; i < l; i++) {
				db.setObject('poll:' + pollid + ':options:' + i, pollOptions[i]);
				db.setAdd('poll:' + pollid + ':options', i);
			}

			//Save the poll and settings to the database
			db.setObject('poll:' + pollid, poll);
			db.setObject('poll:' + pollid + ':settings', pollSettings);
			db.listAppend('polls', pollid);

			//Register poll with a topic and post
			db.setObjectField('topic:' + poll.tid, 'poll:id', pollid);
			db.setObjectField('post:' + poll.pid, 'poll:id', pollid);

			//Check if this poll is scheduled to end
			if (parseInt(pollSettings.end, 10) > 0) {
				Backend.schedulePoll(pollid);
			}

			return callback(null, pollid);
		});
	},
	getPoll: function(data, callback) {
		var pollid = data.pollid,
			uid = data.uid || false,
			withVotes = (data.anon ? false : !!data.withVotes);

		async.parallel({
			info: function(next) {
				Backend.getPollInfo(pollid, next);
			},
			options: function(next) {
				Backend.getPollOptions(pollid, withVotes, next);
			},
			settings: function(next) {
				Backend.getPollSettings(pollid, next);
			},
			hasvoted: function(next) {
				if (uid) {
					Backend.hasUidVoted(uid, pollid, next);
				} else {
					next(null, false);
				}
			}
		}, callback);
	},
	getPollIdByTid: function(tid, callback) {
		db.getObjectField('topic:' + tid, 'poll:id', callback);
	},
	getPollIdByPid: function(pid, callback) {
		db.getObjectField('post:' + pid, 'poll:id', callback);
	},
	getPollInfo: function(pollid, callback) {
		db.getObject('poll:' + pollid, callback);
	},
	getPollOptions: function(pollid, withVotes, callback) {
		if (typeof withVotes === 'function') {
			callback = withVotes;
			withVotes = false;
		}

		db.getSetMembers('poll:' + pollid + ':options', function(err, options) {
			async.map(options, function(option, next) {
				Backend.getPollOption(pollid, option, withVotes, next);
			}, callback);
		});
	},
	getPollOption: function(pollid, option, withVotes, callback) {
		async.parallel([function(next) {
			db.getObject('poll:' + pollid + ':options:' + option, next);
		}, function(next) {
			if (withVotes) {
				db.getSetMembers('poll:' + pollid + ':options:' + option + ':votes', next);
			} else {
				next();
			}
		}], function(err, results) {
			if (results[1]) {
				results[0].votes = results[1];
			}
			callback(null, results[0]);
		});
	},
	getPollSettings: function(pollid, callback) {
		db.getObject('poll:' + pollid + ':settings', callback);
	},
	pollHasOption: function(pollid, option, callback) {
		db.isSetMember('poll:' + pollid + ':options', option, callback);
	},
	pollHasOptions: function(pollid, options, callback) {
		db.isSetMembers('poll:' + pollid + ':options', options, callback);
	},
	hasPollEnded: function(pollid, callback) {
		Backend.getPollField(pollid, 'ended', function(err, result) {
			callback(err, parseInt(result, 10) === 1);
		});
	},
	endPoll: function(pollid) {
		db.setRemove('polls:scheduled', pollid);
		Backend.setPollField(pollid, 'ended', 1);
	},
	isPollDeleted: function(pollid, callback) {
		Backend.getPollField(pollid, 'deleted', function(err, result) {
			callback(err, parseInt(result, 10) === 1);
		});
	},
	deletePoll: function(pollid) {
		Backend.setPollField(pollid, 'deleted', 1);
	},
	restorePoll: function(pollid) {
		Backend.setPollField(pollid, 'edited', 0);
		Backend.setPollField(pollid, 'deleted', 0);
	},
	schedulePoll: function(pollid) {
		db.setAdd('polls:scheduled', pollid);
		require('./utils').scheduler.add(pollid);
	},
	getScheduledPolls: function(callback) {
		db.getSetMembers('polls:scheduled', callback);
	},
	changePid: function(pollid, pid, callback) {
		async.parallel([function(next) {
			Backend.setPollField(pollid, 'pid', pid, next);
		}, function(next) {
			db.setObjectField('post:' + pid, 'poll:id', pollid, next);
		}], callback);
	},
	changeTid: function(pollid, tid, callback) {
		async.parallel([function(next) {
			Backend.setPollField(pollid, 'tid', tid, next);
		}, function(next) {
			db.setObjectField('topic:' + tid, 'poll:id', pollid, next);
		}], callback);
	},
	setPollField: function(pollid, field, value, callback) {
		db.setObjectField('poll:' + pollid, field, value, callback);
	},
	setPollFields: function(pollid, fields, values, callback) {
		db.setObjectFields('poll:' + pollid, fields, values, callback);
	},
	getPollField: function(pollid, field, callback) {
		db.getObjectField('poll:' + pollid, field, callback);
	},
	getPollFields: function(pollid, fields, callback) {
		db.getObjectFields('poll:' + pollid, fields, callback);
	},
	/***************************
	 * Vote methods start here *
	 ***************************/
	addVote: function(voteData, callback) {
		var pollid = voteData.pollid,
			options = voteData.options,
			uid = voteData.uid;

		async.parallel({
			options: function(next) {
				async.each(options, function(option, next) {
					//Increase option vote count
					//next is called here because the option votecount has been updated, it doesn't matter when the uid is added
					db.incrObjectField('poll:' + pollid + ':options:' + option, 'votecount', next);
					//Add uid to list of votes
					db.setAdd('poll:' + pollid + ':options:' + option + ':votes', uid);
				}, function(err) {
					//Get poll options for callback
					Backend.getPollOptions(pollid, next);
				});
			},
			info: function(next) {
				//Add uid to poll voters
				db.setAdd('poll:' + pollid + ':voters', uid);
				//Increase poll vote count
				db.incrObjectFieldBy('poll:' + pollid, 'votecount', options.length, function(err, result){
					next(err, {
						votecount: result
					})
				});
			}
		}, callback);
	},
	removeVote: function(voteData, callback) {
		var pollid = voteData.pollid,
			options = voteData.options,
			uid = voteData.uid;

		async.parallel({
			options: function(next) {
				async.each(options, function(option, next) {
					//Decrease option vote count
					//next is called here because the option votecount has been updated, it doesn't matter when the uid is added
					db.decrObjectField('poll:' + pollid + ':options:' + option, 'votecount', next);
					//Remove uid from list of votes
					db.setRemove('poll:' + pollid + ':options:' + option + ':votes', uid);
				}, function(err) {
					//Get poll options for callback
					Backend.getPollOptions(pollid, next);
				});
			},
			info: function(next) {
				//Remove uid from poll voters
				db.setRemove('poll:' + pollid + ':voters', uid);
				//Decrease poll vote count
				db.decrObjectFieldBy('poll:' + pollid, 'votecount', options.length, function(err, result){
					next(err, {
						votecount: result
					})
				});
			}
		}, callback);
	},
	canVote: function(voteData, callback) {
		async.parallel([
			function(next) {
				//hasended
				Backend.hasPollEnded(voteData.pollid, next);
			},
			function(next) {
				//isdeleted
				Backend.isPollDeleted(voteData.pollid, next);
			},
			function(next) {
				//hasvoted
				Backend.hasUidVoted(voteData.uid, voteData.pollid, next);
			}
		], function(err, result) {
			callback(err, result.indexOf(true) === -1);
		});
	},
	hasUidVoted: function(uid, pollid, callback) {
		db.isSetMember('poll:' + pollid + ':voters', uid, callback);
	},
	hasUidVotedOnOption: function(uid, pollid, option, callback) {
		db.isSetMember('poll:' + pollid + ':options:' + option + ':votes', uid, callback);
	}
};

module.exports = Backend;