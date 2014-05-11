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
								postData['poll:id'] = pollid;
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
			if (data.posts[0]['poll:id']) {
				//Render the client notification and add to post
				Utils.app.render('poll/notify', { pollid: data.posts[0]['poll:id'] }, function(err, html) {
					data.posts[0].content += html;
					return callback(null, data);
				});
			} else {
				return callback(null, data);
			}

		}
	}
};

module.exports = Hooks;