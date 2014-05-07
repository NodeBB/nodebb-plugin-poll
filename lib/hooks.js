var XRegExp = require('xregexp').XRegExp,
	S = require('string'),

	NodeBB = require('./nodebb'),
	Topics = NodeBB.topics,

	Backend = require('./backend'),
	Utils = require('./utils'),
	//Old regex
	//pollRegex = XRegExp('(?:(?:\\[(?<title>.+?)\\]\\n)(?<content>(?:[[\\]|()]{2}.+\\n?)+))', 'g'),
	//optionRegex = XRegExp('(?<type>[[\\]|()]{2})(?<text>.+)', 'g');
	pollRegex = XRegExp('(?:(?:\\[poll(?<settings>.*?)\\])\n(?<content>(?:-.+?\n)+)(?:\\[\/poll\\]))', 'g'),
	optionRegex = XRegExp('', 'g');

var Tools = {
	app: null,
	hasPoll: function(post) {
		return XRegExp.exec(post, pollRegex) !== null;
	},
	parse: function(post) {
		var match = XRegExp.exec(post, pollRegex);
		if (match !== null) {
			var pollSettings = null,
				pollContent = match.content,
				pollOptions = [],
				rawOptions = pollContent.split('\n');

			for (var option in rawOptions) {
				if (rawOptions.hasOwnProperty(option) && rawOptions[option].length > 0) {
					option = S(rawOptions[option].split('-')[1]).stripTags().trim().s;
					if (option.length > 0) {
						pollOptions.push(option);
					}
				}
			}

			//Todo: add settings parsing

			return {
				options: pollOptions,
				settings: {
					maxvotes: 1
				}
			};
		} else {
			return null;
		}
	},
	prepare: function(postData, pollData) {
		if (!pollData && Tools.hasPoll(postData.content)) {
			pollData = Tools.parse(postData.content);
		}

		for(var i = 0, l = pollData.options.length; i < l; i++) {
			pollData.options[i] = {
				id: i,
				title: pollData.options[i]
			};
		}

		return {
			title: pollData.title,
			uid: postData.uid,
			tid: postData.tid,
			pid: postData.pid,
			deleted: 0,
			ended: 0,
			timestamp: postData.timestamp,
			settings: pollData.settings,
			options: pollData.options
		};
	}
};

var Hooks = {
	filter: {
		postSave: function(postData, callback) {
			var pollData = Tools.parse(postData.content);
			//Check if there's poll markup
			if (pollData) {
				//Found a poll, is it the first post of a topic though?
				Utils.isFirstPost(postData.pid, postData.tid, function(err, isFirstPost) {
					if (isFirstPost) {
						Topics.getTopicField(postData.tid, 'title', function(err, title) {
							//Take the topic title as poll title for now
							pollData.title = title;

							var poll = Tools.prepare(postData, pollData);
							//console.log(poll);

							Backend.addPoll(poll, function(err, pollid) {
								//If it is, remove the poll markup from the post and save the poll
								postData['poll:id'] = pollid;
								postData.content = XRegExp.replace(postData.content, pollRegex, '');
								//Done
								callback(null, postData);
							});
						});
					}
				});
			} else {
				return callback(null, postData);
			}
		},
		getPosts: function(data, callback) {
			if (data.posts[0]['poll:id']) {
				//Render the client notification and add to post
				Tools.app.render('poll/notify', { pollid: data.posts[0]['poll:id'] }, function(err, html) {
					data.posts[0].content += html;
					return callback(null, data);
				});
			} else {
				return callback(null, data);
			}

		}
	}
};

Hooks.tools = Tools;

module.exports = Hooks;