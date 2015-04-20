var XRegExp = require('xregexp').XRegExp,

	NodeBB = require('./nodebb'),

	Backend = require('./backend'),
	Utils = require('./utils');

//Todo: add hooks for post / topic changes like delete
var Hooks = {
	filter: {
		postSave: function(postData, callback) {
			//Is this the first post?
			Utils.isFirstPost(postData.pid, postData.tid, function(err, isFirstPost) {
				if (isFirstPost) {
					Utils.parsePoll(postData.content, function(err, pollData) {
						//Check if there's poll markup
						if (pollData && pollData.options.length > 0) {
							var poll = Utils.preparePoll(postData, pollData);

							Backend.addPoll(poll, function(err, pollid) {
								postData.content = Utils.removeMarkup(postData.content);
								//Done
								callback(null, postData);
							});
						} else {
							return callback(null, postData);
						}
					});
				} else {
					return callback(null, postData);
				}
			});
		},
		getPosts: function(data, callback) {
			if (Array.isArray(data.posts) && data.posts.length && data.posts[0] && data.posts[0]['poll:id']) {
				//Render the client notification and add to post
				Utils.app.render('poll/notify', { pollid: data.posts[0]['poll:id'] }, function(err, html) {
					NodeBB.translator.translate(html, function(html) {
						data.posts[0].content += html;
						return callback(null, data);
					});
				});
			} else {
				return callback(null, data);
			}
		}
	},
	action: {
		postDelete: function(pid) {
			Backend.getPollIdByPid(pid, function(err, pollid) {
				if (pollid) {
					Backend.deletePoll(pollid);
				}
			});
		},
		postRestore: function(postData) {
			Backend.getPollIdByPid(postData.pid, function(err, pollid) {
				if (pollid) {
					Backend.restorePoll(pollid);
				}
			});
		},
		topicDelete: function(tid) {
			Backend.getPollIdByTid(tid, function(err, pollid) {
				if (pollid) {
					Backend.deletePoll(pollid);
				}
			});
		},
		topicRestore: function(tid) {
			Backend.getPollIdByTid(tid, function(err, pollid) {
				if (pollid) {
					Backend.restorePoll(pollid);
				}
			});
		}
	}
};

module.exports = Hooks;
