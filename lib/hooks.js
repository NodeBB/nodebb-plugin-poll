var XRegExp = require('xregexp').XRegExp,

	NodeBB = require('./nodebb'),

	Poll = require('./poll'),
	Serializer = require('./serializer'),
	Utils = require('./utils');

(function(Hooks) {

	Hooks.filter = {};
	Hooks.action = {};

	Hooks.filter.parseRaw = function(raw, callback) {
		callback(null, Serializer.removeMarkup(raw, '[Poll]'));
	};

	Hooks.filter.postSave = function(postData, callback) {
		// Is this the first post?
		Utils.isFirstPost(postData.pid, postData.tid, function(err, isFirstPost) {
			if (!isFirstPost) {
				return callback(null, postData);
			}

			Serializer.serialize(postData.content, function(err, pollData) {
				//Check if there's poll markup
				if (!pollData || !pollData.options.length) {
					return callback(null, postData);
				}

				Poll.add(pollData, postData, function(err, pollId) {
					postData.content = Serializer.removeMarkup(postData.content);
					callback(null, postData);
				});
			});
		});
	};

	Hooks.filter.getPosts = function(data, callback) {
		if (!Array.isArray(data.posts) || !data.posts.length || !data.posts[0] || !data.posts[0]['poll:id']) {
			return callback(null, data);
		}

		// Render the client notification and add to post
		Utils.app.render('poll/notify', { pollId: data.posts[0]['poll:id'] }, function(err, html) {
			data.posts[0].content += html;
			return callback(null, data);
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
