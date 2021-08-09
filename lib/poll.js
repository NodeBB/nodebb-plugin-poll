'use strict';

const NodeBB = require('./nodebb');

const Vote = require('./vote');
const Scheduler = require('./scheduler');

(function (Poll) {
	const POLL_DATA_VERSION = 2;

	Poll.add = async function (pollData, postData) {
		const pollId = await NodeBB.db.incrObjectField('global', 'nextPollId');

		const poll = {
			pollId: pollId,
			uid: postData.editor || postData.uid,
			tid: postData.tid,
			pid: postData.pid,
			deleted: 0,
			ended: 0,
			timestamp: postData.edited || postData.timestamp,
			version: POLL_DATA_VERSION,
		};

		pollData.options = pollData.options.map((val, i) => ({
			id: i,
			title: val,
		}));

		const optionsPromises = [];
		for (const option of pollData.options) {
			const optionPromise = NodeBB.db.setObject(`poll:${pollId}:options:${option.id}`, option)
				.then(() => NodeBB.db.setAdd(`poll:${pollId}:options`, option.id));
			optionsPromises.push(optionPromise);
		}

		await Promise.all([
			Promise.all(optionsPromises),
			NodeBB.db.setObject(`poll:${pollId}`, poll),
			NodeBB.db.setObject(`poll:${pollId}:settings`, pollData.settings),
			NodeBB.db.listAppend('polls', pollId),
			NodeBB.db.setObjectField(`topic:${poll.tid}`, 'pollId', pollId),
		]);

		// Check if this poll is scheduled to end
		if (parseInt(pollData.settings.end, 10) > 0) {
			Poll.schedule(pollId);
		}

		return pollId;
	};

	Poll.get = async function (pollId, uid, withVotes) {
		const [info, options, settings, hasVoted, vote] = await Promise.all([
			Poll.getInfo(pollId),
			Poll.getOptions(pollId, withVotes),
			Poll.getSettings(pollId),
			uid ? Vote.hasUidVoted(uid, pollId) : false,
			uid ? Vote.getUidVote(uid, pollId) : null,
		]);

		options.forEach((option) => {
			const percentage = ((option.voteCount / info.voteCount) * 100).toFixed(0);
			option.percentage = isNaN(percentage) ? 0 : percentage;
		});
		settings.disallowVoteUpdate = parseInt(settings.disallowVoteUpdate, 10);

		return { info, options, settings, hasVoted, vote };
	};

	Poll.getPollIdByTid = async function (tid) {
		return NodeBB.db.getObjectField(`topic:${tid}`, 'pollId');
	};

	Poll.getPollIdByPid = async function (pid) {
		return NodeBB.db.getObjectField(`post:${pid}`, 'pollId');
	};

	Poll.getInfo = async function (pollId) {
		const [poll, voteCount] = await Promise.all([
			NodeBB.db.getObject(`poll:${pollId}`),
			Poll.getVoteCount(pollId),
		]);
		poll.voteCount = parseInt(voteCount, 10) || 0;
		return poll;
	};

	Poll.getOptions = async function (pollId, withVotes = false) {
		const options = await NodeBB.db.getSetMembers(`poll:${pollId}:options`);
		return Promise.all(options.map(option => Poll.getOption(pollId, option, withVotes)));
	};

	Poll.getOption = async function (pollId, option, withVotes) {
		const [optionData, votes, voteCount] = await Promise.all([
			NodeBB.db.getObject(`poll:${pollId}:options:${option}`),
			withVotes ? NodeBB.db.getSortedSetRange(`poll:${pollId}:options:${option}:votes`, 0, -1) : null,
			Poll.getOptionVoteCount(pollId, option),
		]);

		if (votes) {
			optionData.votes = votes;
		}
		optionData.voteCount = parseInt(voteCount, 10) || 0;

		return optionData;
	};

	Poll.getVotersCount = async function (pollId) {
		return NodeBB.db.sortedSetCard(`poll:${pollId}:voters`);
	};

	Poll.getVoteCount = async function (pollId) {
		const options = await NodeBB.db.getSetMembers(`poll:${pollId}:options`)
			.catch(err => NodeBB.winston.error('[nodebb-plugin-poll]', err));

		const voteCounts = await Promise.all(options.map(
			option => Poll.getOptionVoteCount(pollId, option)
		));

		return voteCounts.reduce((a, b) => a + b, 0);
	};

	Poll.getOptionVoteCount = async function (pollId, option) {
		return NodeBB.db.sortedSetCard(`poll:${pollId}:options:${option}:votes`);
	};

	Poll.hasOption = async function (pollId, option) {
		return NodeBB.db.isSetMember(`poll:${pollId}:options`, option);
	};

	Poll.hasOptions = async function (pollId, options) {
		return NodeBB.db.isSetMembers(`poll:${pollId}:options`, options);
	};

	Poll.getSettings = async function (pollId) {
		return NodeBB.db.getObject(`poll:${pollId}:settings`);
	};

	Poll.isDeleted = async function (pollId) {
		const result = await Poll.getField(pollId, 'deleted');
		return parseInt(result, 10) === 1;
	};

	Poll.delete = async function (pollId) {
		return Poll.setField(pollId, 'deleted', 1);
	};

	Poll.restore = async function (pollId) {
		await Poll.setField(pollId, 'edited', 0);
		await Poll.setField(pollId, 'deleted', 0);
	};

	Poll.schedule = async function (pollId) {
		await NodeBB.db.setAdd('polls:scheduled', pollId);
		await Scheduler.add(pollId);
	};

	Poll.getScheduled = async function () {
		return NodeBB.db.getSetMembers('polls:scheduled');
	};

	Poll.hasEnded = async function (pollId) {
		const result = await Poll.getField(pollId, 'ended');
		return parseInt(result, 10) === 1;
	};

	Poll.doesDisallowVoteUpdate = async function (pollId) {
		const result = await Poll.getSettingsField(pollId, 'disallowVoteUpdate');
		return parseInt(result, 10) === 1;
	};

	Poll.doesAllowVoteUpdate = async function (pollId) {
		const result = await Poll.getSettingsField(pollId, 'disallowVoteUpdate');
		return parseInt(result, 10) !== 1;
	};

	Poll.end = async function (pollId) {
		await NodeBB.db.setRemove('polls:scheduled', pollId);
		await Poll.setField(pollId, 'ended', 1);
	};

	Poll.changePid = async function (pollId, pid) {
		return Promise.all([
			Poll.setField(pollId, 'pid', pid),
			NodeBB.db.setObjectField(`post:${pid}`, 'pollId', pollId),
		]);
	};

	Poll.changeTid = async function (pollId, tid) {
		return Promise.all([
			Poll.setField(pollId, 'tid', tid),
			NodeBB.db.setObjectField(`topic:${tid}`, 'pollId', pollId),
		]);
	};

	Poll.setField = async function (pollId, field, value) {
		return NodeBB.db.setObjectField(`poll:${pollId}`, field, value);
	};

	Poll.getField = async function (pollId, field) {
		return NodeBB.db.getObjectField(`poll:${pollId}`, field);
	};

	Poll.getFields = async function (pollId, fields) {
		return NodeBB.db.getObjectFields(`poll:${pollId}`, fields);
	};

	Poll.getSettingsField = async function (pollId, field) {
		return NodeBB.db.getObjectField(`poll:${pollId}:settings`, field);
	};
}(exports));
