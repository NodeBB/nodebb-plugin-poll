'use strict';

const cron = require('cron').CronJob;
const NodeBB = require('./nodebb');

const Poll = require('./poll');

const Scheduler = exports;
const jobs = {};

Scheduler.start = async function () {
	const pollIds = await Poll.getScheduled();
	await Promise.all(pollIds.map(Scheduler.add));
};

Scheduler.add = async function (pollId) {
	if (Object.keys(jobs).indexOf(pollId.toString()) !== -1) {
		return;
	}

	const settings = await Poll.getSettings(pollId);
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

