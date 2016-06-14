var NodeBB = require('./nodebb'),

	Config = require('./config'),
	Poll = require('./poll'),
	Serializer = require('./serializer');

(function(Hooks) {

	Hooks.filter = {};
	Hooks.action = {};

	Hooks.filter.parseRaw = function(raw, callback) {
		callback(null, Serializer.removeMarkup(raw, '[Poll]'));
	};

	Hooks.filter.postSave = function(postData, callback) {
		// Is this the first post?
		NodeBB.Topics.getPostCount(postData.tid, function(err, postCount) {
			if (parseInt(postCount, 10) !== 0) {
				return callback(null, postData);
			}

			savePoll(postData, callback);
		});
	};

	Hooks.filter.postEdit = function(obj, callback) {
		if (obj.post.hasOwnProperty('pollId')) {
			return callback(null, obj);
		}

		NodeBB.Topics.getTopicFields(obj.post.tid, ['mainPid', 'cid'], function(err, result) {
			if (parseInt(result.mainPid, 10) !== parseInt(obj.post.pid, 10)) {
				return callback(null, obj);
			}

			canCreate(result.cid, obj.post.editor, function(err, canCreate) {
				if (err) {
					return callback(err, obj);
				}

				savePoll(obj.post, function(err, postData) {
					if (err || !postData.pollId) {
						return callback(err, obj);
					}

					// NodeBB only updates the edited, editor and content fields, so we add the pollId field manually.
					NodeBB.Posts.setPostField(obj.post.pid, 'pollId', postData.pollId, function() {
						callback(null, obj);
					});
				});
			});
		});
	};

	Hooks.filter.topicPost = function(data, callback) {
		if (Serializer.hasMarkup(data.content)) {
			canCreate(data.cid, data.uid, function(err, can) {
				return callback(err, data);
			});
		} else {
			return callback(null, data);
		}
	};

	Hooks.action.postDelete = function(pid) {
		Poll.getPollIdByPid(pid, function(err, pollId) {
			if (pollId) {
				Poll.delete(pollId);
			}
		});
	};

	Hooks.action.postRestore = function(postData) {
		Poll.getPollIdByPid(postData.pid, function(err, pollId) {
			if (pollId) {
				Poll.restore(pollId);
			}
		});
	};

	Hooks.action.topicDelete = function(tid) {
		Poll.getPollIdByTid(tid, function(err, pollId) {
			if (pollId) {
				Poll.delete(pollId);
			}
		});
	};

	Hooks.action.topicRestore = function(tid) {
		Poll.getPollIdByTid(tid, function(err, pollId) {
			if (pollId) {
				Poll.restore(pollId);
			}
		});
	};

	function canCreate(cid, uid, callback) {
		NodeBB.Privileges.categories.can('poll:create', cid, uid, function (err, can) {
			if (err || !can) {
				return callback(new Error('[[poll:error.privilege.create]]'), can);
			} else {
				return callback(null, can);
			}
		});
	}

	function savePoll(postData, callback) {
		var pollData = Serializer.serialize(postData.content, Config.settings.get());

		if (!pollData || !pollData.options.length) {
			return callback(null, postData);
		}

		Poll.add(pollData, postData, function(err, pollId) {
			if (err) {
				return callback(err, postData);
			}

			postData.pollId = pollId;
			postData.content = Serializer.removeMarkup(postData.content);

			callback(null, postData);
		});
	}

})(exports);
