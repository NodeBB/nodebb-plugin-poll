"use strict";

var Poll = require('./poll'),

	jobs = {},

	Scheduler = {};

Scheduler.start = function() {
	Poll.getScheduled(function(err, pollIds) {
		pollIds.forEach(function(pollId) {
			Scheduler.add(pollId);
		});
	});
};

Scheduler.add = function(pollId) {
	if (Object.keys(jobs).indexOf(pollId.toString()) !== -1) {
		return;
	}

	Poll.getSettings(pollId, function(err, settings) {
		if (err) {
			return console.log(err.stack);
		}
		if (!settings) {
			return console.log('Poll ID ' + pollId + ' has no settings!');
		}

		var now = Date.now(),
			end = parseInt(settings.end, 10);

		if (end < now) {
			Scheduler.end(pollId);
		} else {
			jobs[pollId] = new cron(new Date(end), function() {
				Scheduler.end(pollId);
			}, null, true);
		}
	});
};

Scheduler.end = function(pollId) {
	var index = Object.keys(jobs).indexOf(pollId.toString());

	if (index !== -1 && jobs[pollId] !== undefined) {
		jobs[pollId].stop();
		delete jobs[pollId];
	}

	Poll.end(pollId);
};

module.exports = Scheduler;