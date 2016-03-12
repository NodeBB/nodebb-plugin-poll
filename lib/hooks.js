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
		});
	};

	Hooks.filter.getPosts = function(data, callback) {
		var allowAnon = Config.settings.get('toggles.allowAnon');

		if (!data.posts[0]['pollId'] || (!data.uid && !allowAnon)) {
			return callback(null, data);
		}

		var pollId = parseInt(data.posts[0]['pollId'], 10);
		Poll.get(pollId, data.uid, !!data.uid, function(err, pollData) {
			if (!pollData.info.version) {
				data.posts[0].content += "<em>Sorry, legacy polls are not supported.</em>";
				return callback(null, data);
			}

			pollData.optionType = parseInt(pollData.settings.maxvotes, 10) > 1 ? 'checkbox' : 'radio';

			NodeBB.app.render('poll/view', { poll: pollData, pollJSON: JSON.stringify(pollData) }, function(err, html) {
				data.posts[0].content = html + data.posts[0].content;
				return callback(null, data);
			});
		});
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

})(exports);
