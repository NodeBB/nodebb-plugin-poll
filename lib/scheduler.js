'use strict';

const cron = require('cron').CronJob;
const NodeBB = require('./nodebb');

const Poll = require('./poll');

(function (Scheduler) {
	const jobs = {};

	Scheduler.start = function () {
		Poll.getScheduled((err, pollIds) => {
			if (err) {
				console.error(err);
			}
			pollIds.forEach((pollId) => {
				Scheduler.add(pollId);
			});
		});
	};

	Scheduler.add = function (pollId) {
		if (Object.keys(jobs).indexOf(pollId.toString()) !== -1) {
			return;
		}

		Poll.getSettings(pollId, (err, settings) => {
			if (err) {
				return NodeBB.winston.error(err);
			}

			if (!settings) {
				return NodeBB.winston.error(`[nodebb-plugin-poll/scheduler] Poll ID ${pollId} has no settings!`);
			}

			const now = Date.now();
			const end = parseInt(settings.end, 10);

			if (end < now) {
				Scheduler.end(pollId);
			} else {
				const date = new Date(end);
				NodeBB.winston.verbose(`[nodebb-plugin-poll/scheduler] Starting scheduler for poll with ID ${pollId} to end on ${date}`);
				jobs[pollId] = new cron(date, (() => {
					Scheduler.end(pollId);
				}), null, true);
			}
		});
	};

	Scheduler.end = function (pollId) {
		NodeBB.winston.verbose(`[nodebb-plugin-poll/scheduler] Ending poll with ID ${pollId}`);

		const index = Object.keys(jobs).indexOf(pollId.toString());

		if (index !== -1 && jobs[pollId] !== undefined) {
			jobs[pollId].stop();
			delete jobs[pollId];
		}

		Poll.end(pollId);
	};
}(exports));
