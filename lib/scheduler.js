'use strict';

var NodeBB = require('./nodebb'),
	Poll = require('./poll'),
	cron = require('cron').CronJob;

(function(Scheduler) {
	var jobs = {};

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
				return NodeBB.winston.error(err);
			}

			if (!settings) {
				return NodeBB.winston.error('[nodebb-plugin-poll/scheduler] Poll ID ' + pollId + ' has no settings!');
			}

			var now = Date.now(),
				end = parseInt(settings.end, 10);

			if (end < now) {
				Scheduler.end(pollId);
			} else {
				var date = new Date(end);
				NodeBB.winston.verbose(
					'[nodebb-plugin-poll/scheduler] Starting scheduler for poll with ID ' + pollId + ' to end on ' + date
				);
				jobs[pollId] = new cron(
					date,
					function() {
						Scheduler.end(pollId);
					},
					null,
					true
				);
			}
		});
	};

	Scheduler.end = function(pollId) {
		NodeBB.winston.verbose('[nodebb-plugin-poll/scheduler] Ending poll with ID ' + pollId);

		var index = Object.keys(jobs).indexOf(pollId.toString());

		if (index !== -1 && jobs[pollId] !== undefined) {
			jobs[pollId].stop();
			delete jobs[pollId];
		}

		Poll.end(pollId);
	};
})(exports);
