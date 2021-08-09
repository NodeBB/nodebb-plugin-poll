'use strict';

const cron = require('cron').CronJob;
const NodeBB = require('./nodebb');

const Poll = require('./poll');

(function (Scheduler) {
	const jobs = {};

	Scheduler.start = async function () {
		try {
			const pollIds = await Poll.getScheduled();
			Promise.all(pollIds.map(pollId => Scheduler.add(pollId)));
		} catch (err) {
			NodeBB.winston.error(err);
		}
	};

	Scheduler.add = async function (pollId) {
		if (Object.keys(jobs).indexOf(pollId.toString()) !== -1) {
			return;
		}

		try {
			const settings = await Poll.getSettings(pollId);
			if (!settings) {
				NodeBB.winston.error(`[nodebb-plugin-poll/scheduler] Poll ID ${pollId} has no settings!`);
				return;
			}

			const now = Date.now();
			const end = parseInt(settings.end, 10);

			if (end < now) {
				return Scheduler.end(pollId);
			}

			const date = new Date(end);
			NodeBB.winston.verbose(`[nodebb-plugin-poll/scheduler] Starting scheduler for poll with ID ${pollId} to end on ${date}`);
			jobs[pollId] = new cron(date, async () => Scheduler.end(pollId), null, true);
		} catch (err) {
			NodeBB.winston.error(err);
		}
	};

	Scheduler.end = async function (pollId) {
		NodeBB.winston.verbose(`[nodebb-plugin-poll/scheduler] Ending poll with ID ${pollId}`);

		const index = Object.keys(jobs).indexOf(pollId.toString());

		if (index !== -1 && jobs[pollId] !== undefined) {
			jobs[pollId].stop();
			delete jobs[pollId];
		}

		await Poll.end(pollId);
	};
}(exports));
