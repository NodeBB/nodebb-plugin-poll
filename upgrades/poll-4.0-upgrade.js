'use strict';

const db = require.main.require('./src/database');
const batch = require.main.require('./src/batch');

module.exports = {
	name: 'Convert data structures for v4.0',
	timestamp: Date.UTC(2026, 2, 7),
	method: async function () {
		const { progress } = this;

		await convertSettings();

		await db.delete('polls:scheduled');

		const pollIds = [...new Set(await db.getListRange('polls', 0, -1))];
		progress.total = pollIds.length;

		await batch.processArray(pollIds, async (pollIds) => {
			let polls = await db.getObjects(pollIds.map(pollId => `poll:${pollId}`));

			await moveSettingsToPollHash(pollIds);

			await addPollsToSortedSet(polls, pollIds);

			await savePollOptionsInPollHash(pollIds);

			await updatePollIdsInPosts(polls, pollIds);

			progress.incr(pollIds.length);
		}, {
			batch: 500,
		});
		await db.delete('polls');
	},
};

async function convertSettings() {
	const settings = await db.getObject('settings:poll');
	if (settings) {
		try {
			const parsed = JSON.parse(settings._);
			const newSettings = {};
			if (parsed?.toggles?.allowAnon) {
				newSettings.allowGuestsToViewResults = parsed.toggles.allowAnon;
			}
			if (parsed?.limits?.maxOptions) {
				newSettings.maxOptions = parsed.limits.maxOptions;
			}
			if (parsed?.defaults?.title) {
				newSettings.defaultTitle = parsed.defaults.title;
			}
			if (parsed?.defaults?.maxvotes) {
				newSettings.maximumVotesPerUser = parsed.defaults.maxvotes;
			}
			await db.setObject('settings:poll', newSettings);
		} catch (err) {
			console.info('[Poll Plugin] Error parsing settings, resetting to defaults');
		}
	}
}

async function moveSettingsToPollHash(pollIds) {
	const pollSettings = await db.getObjects(pollIds.map(pollId => `poll:${pollId}:settings`));
	const bulkSet = [];
	pollSettings.forEach((s, i) => {
		const pollId = pollIds[i];
		if (s && pollId) {
			bulkSet.push([`poll:${pollId}`, {
				title: Object.hasOwn(s, 'title') ? s.title : 'Poll',
				end: Object.hasOwn(s, 'end') ? s.end : 0,
				disallowVoteUpdate: Object.hasOwn(s, 'disallowVoteUpdate') ? s.disallowVoteUpdate : 0,
				allowAnonVoting: Object.hasOwn(s, 'allowAnonVoting') ? s.allowAnonVoting : 0,
				maximumVotesPerUser: Object.hasOwn(s, 'maxvotes') ? s.maxvotes : 0,
			}]);
		}
	});
	await db.setObjectBulk(bulkSet);
	await db.deleteAll(pollIds.map(pollId => `poll:${pollId}:settings`));
}

async function addPollsToSortedSet(polls, pollIds) {
	const bulkAdd = [];
	polls.forEach((poll, index) => {
		if (poll) {
			bulkAdd.push([`polls:createtime`, poll.timestamp || 0, pollIds[index]]);
		}
	});
	await db.sortedSetAddBulk(bulkAdd);
}

async function savePollOptionsInPollHash(pollIds) {
	const pollOptions = await db.getSetsMembers(pollIds.map(pollId => `poll:${pollId}:options`));
	const bulkSet = [];
	await Promise.all(pollOptions.map(async (options, index) => {
		const pollId = pollIds[index];
		if (pollId && options?.length) {
			const keys = options.map((option, i) => `poll:${pollId}:options:${options[i]}`)
			const optionData = await db.getObjects(keys);
			bulkSet.push([
				`poll:${pollId}`,
				{
					pollId: pollId, // some old polls had "pollid" field, this fixes that
					options: JSON.stringify(optionData.map(o => ({ id: o.id, title: o.title })))
				},
			]);
		}
	}));

	await db.setObjectBulk(bulkSet);
	await db.deleteAll(pollIds.map(pollId => `poll:${pollId}:options`))
}

async function updatePollIdsInPosts(polls, pollIds) {
	const pids = polls.map(poll => poll && poll.pid);
	const bulkSet = [];
	polls.forEach((poll, index) => {
		if (poll && poll.pid) {
			bulkSet.push([
				`post:${poll.pid}`,
				{ pollIds: JSON.stringify([pollIds[index]]) }
			]);
		}
	});

	await db.setObjectBulk(bulkSet);
	await db.deleteObjectFields(pids.map(pid => `post:${pid}`), ['pollId']);
}