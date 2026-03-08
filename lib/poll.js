'use strict';

const NodeBB = require('./nodebb');
const db = require.main.require('./src/database');

const Vote = require('./vote');

const Poll = exports;

Poll.add = async function (postData, polls) {
	// postData is what is being saved to db
	// polls is submited by user
	const savePolls = [];
	for (const pollData of polls) {
		// eslint-disable-next-line no-await-in-loop
		const pollId = await db.incrObjectField('global', 'nextPollId');

		const poll = {
			pollId: pollId,
			title: pollData.title,
			uid: postData.editor || postData.uid,
			pid: postData.pid,
			deleted: 0,
			end: pollData.end || 0,
			maximumVotesPerUser: pollData.maximumVotesPerUser || 1,
			timestamp: postData.edited || postData.timestamp,
		};
		if (Object.hasOwn(pollData, 'allowAnonVoting')) {
			poll.allowAnonVoting = pollData.allowAnonVoting;
		}
		if (Object.hasOwn(pollData, 'disallowVoteUpdate')) {
			poll.disallowVoteUpdate = pollData.disallowVoteUpdate;
		}
		// [{id: '1772931625035', title: 'option 1'} {id: '1772931626635', title: 'option 2'}]
		poll.options = JSON.stringify(pollData.options || []);

		savePolls.push(poll);
	}

	if (savePolls.length) {
		postData.pollIds = JSON.stringify(savePolls.map(p => p.pollId));
	}

	await Promise.all([
		db.setObjectBulk(savePolls.map(p => [`poll:${p.pollId}`, p])),
		db.sortedSetAdd('polls:createtime', savePolls.map(p => p.timestamp), savePolls.map(p => p.pollId)),
	]);
};

Poll.get = async function (pollId, uid, withVotes = false) {
	const [info, hasVoted, vote] = await Promise.all([
		Poll.getInfo(pollId, withVotes),
		uid ? Vote.hasUidVoted(uid, pollId) : false,
		uid ? Vote.getUidVote(uid, pollId) : null,
	]);

	info.options.forEach((option) => {
		const percentage = ((option.voteCount / info.voteCount) * 100).toFixed(0);
		option.percentage = isNaN(percentage) ? 0 : percentage;
	});

	info.disallowVoteUpdate = parseInt(info.disallowVoteUpdate, 10);
	return {
		info,
		options: info.options,
		hasVoted,
		vote,
	};
};

Poll.getPollIdsByPid = async function (pid) {
	const pollIdsJson = await NodeBB.db.getObjectField(`post:${pid}`, 'pollIds');
	if (!pollIdsJson) {
		return [];
	}
	try {
		return JSON.parse(pollIdsJson || '[]');
	} catch (err) {
		return [];
	}
};

Poll.getInfo = async function (pollId, withVotes = false) {
	const [poll, voteCount] = await Promise.all([
		db.getObject(`poll:${pollId}`),
		Poll.getVoteCount(pollId),
	]);
	poll.voteCount = parseInt(voteCount, 10) || 0;
	const end = parseInt(poll.end, 10);
	poll.ended = end > 0 && Date.now() > end;
	poll.options = await loadOptions(pollId, poll.options, withVotes);
	return poll;
};

Poll.getOptions = async function (pollId, withVotes = false) {
	const optionsJson = await db.getObjectField(`poll:${pollId}`, 'options');
	return await loadOptions(pollId, optionsJson, withVotes);
};

Poll.getPollOptionIds = async function (pollId) {
	const optionsJson = await db.getObjectField(`poll:${pollId}`, 'options');
	return tryParseOptions(optionsJson).map(opts => opts && String(opts.id));
};

async function loadOptions(pollId, optionsJson, withVotes = false) {
	const options = tryParseOptions(optionsJson);

	const votes = await db.getSortedSetsMembers(options.map(o => `poll:${pollId}:options:${o.id}:votes`));

	options.forEach((option, index) => {
		if (option) {
			option.voteCount = votes[index].length;
			if (withVotes) {
				option.votes = votes[index];
			}
		}
	});
	return options;
}

function tryParseOptions(optionsJson) {
	if (!optionsJson) return [];
	try {
		return JSON.parse(optionsJson || '[]');
	} catch (err) {
		return [];
	}
}

Poll.getOption = async function (pollId, option, withVotes = false) {
	const [optionsJson, votes, voteCount] = await Promise.all([
		db.getObjectField(`poll:${pollId}`, 'options'),
		withVotes ?
			db.getSortedSetRange(`poll:${pollId}:options:${option}:votes`, 0, -1) :
			null,
		Poll.getOptionVoteCount(pollId, option),
	]);
	const options = tryParseOptions(optionsJson);
	const optionData = options.find(opt => String(opt.id) === String(option));
	if (!optionData) {
		return null;
	}

	if (votes) {
		optionData.votes = votes;
	}
	optionData.voteCount = parseInt(voteCount, 10) || 0;
	return optionData;
};

Poll.getVotersCount = async function (pollId) {
	return await db.sortedSetCard(`poll:${pollId}:voters`);
};

Poll.getVoteCount = async function (pollId) {
	const optionIds = await Poll.getPollOptionIds(pollId);
	return await db.sortedSetsCardSum(
		optionIds.map(option => `poll:${pollId}:options:${option}:votes`)
	);
};

Poll.getOptionVoteCount = async function (pollId, option) {
	return await db.sortedSetCard(`poll:${pollId}:options:${option}:votes`);
};

Poll.hasOption = async function (pollId, option) {
	const optionIds = new Set(await Poll.getPollOptionIds(pollId));
	return optionIds.has(String(option));
};

Poll.hasOptions = async function (pollId, options) {
	const optionIds = new Set(await Poll.getPollOptionIds(pollId));
	return options.map(option => optionIds.has(String(option)));
};

Poll.isDeleted = async function (pollId) {
	const result = await Poll.getField(pollId, 'deleted');
	return parseInt(result, 10) === 1;
};

Poll.delete = async function (pollIds) {
	await db.setObject(
		pollIds.map(pollId => `poll:${pollId}`),
		{ deleted: 1 },
	);
};

Poll.restore = async function (pollIds) {
	await db.setObject(
		pollIds.map(pollId => `poll:${pollId}`),
		{
			edited: 0,
			deleted: 0,
		},
	);
};

Poll.hasEnded = async function (pollId) {
	let end = await Poll.getField(pollId, 'end');
	end = parseInt(end, 10);
	return end > 0 && Date.now() > end;
};

Poll.doesDisallowVoteUpdate = async function (pollId) {
	const result = await Poll.getField(pollId, 'disallowVoteUpdate');
	return parseInt(result, 10) === 1;
};

Poll.doesAllowVoteUpdate = async function (pollId) {
	const result = await Poll.getField(pollId, 'disallowVoteUpdate');
	return parseInt(result, 10) !== 1;
};

Poll.setField = async function (pollId, field, value) {
	await NodeBB.db.setObjectField(`poll:${pollId}`, field, value);
};

Poll.setFields = async function (pollId, data) {
	await NodeBB.db.setObject(`poll:${pollId}`, data);
};

Poll.getField = async function (pollId, field) {
	return await NodeBB.db.getObjectField(`poll:${pollId}`, field);
};

Poll.getFields = async function (pollId, fields) {
	return await NodeBB.db.getObjectFields(`poll:${pollId}`, fields);
};

